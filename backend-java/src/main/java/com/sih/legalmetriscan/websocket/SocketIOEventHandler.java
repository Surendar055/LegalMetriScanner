package com.sih.legalmetriscan.websocket;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.SocketIOServer;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sih.legalmetriscan.model.SessionInfo;
import com.sih.legalmetriscan.model.InspectionRecord;
import com.sih.legalmetriscan.service.InspectionDatabaseService;
import com.sih.legalmetriscan.service.SessionService;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileOutputStream;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Component
public class SocketIOEventHandler {

    private final SocketIOServer server;
    private final SessionService sessionService;
    private final InspectionDatabaseService inspectionDatabaseService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public SocketIOEventHandler(SocketIOServer server, SessionService sessionService, InspectionDatabaseService inspectionDatabaseService) {
        this.server = server;
        this.sessionService = sessionService;
        this.inspectionDatabaseService = inspectionDatabaseService;
    }

    @PostConstruct
    public void startAndRegister() {
        // Connection listener
        server.addConnectListener(client -> {
            System.out.println("[SocketIO] Client connected: " + client.getSessionId());
        });

        // Disconnection listener with 10s grace period for mobile
        server.addDisconnectListener(client -> {
            UUID clientId = client.getSessionId();
            System.out.println("[SocketIO] Client disconnected: " + clientId);

            sessionService.findSessionBySocketId(clientId).ifPresent(entry -> {
                String sessionId = entry.getKey();
                SessionInfo session = entry.getValue();

                if (clientId.equals(session.getPhoneSocketId())) {
                    session.setPhoneSocketId(null);
                    // 10-second grace period for mobile reconnect
                    scheduler.schedule(() -> {
                        if (session.getPhoneSocketId() == null) {
                            session.setDevice(null);
                            Map<String, Object> payload = Map.of("sessionId", sessionId);
                            server.getRoomOperations(sessionId).sendEvent("device:disconnected", payload);
                            System.out.println("[SocketIO] Mobile confirmed left session: " + sessionId);
                        }
                    }, 10, TimeUnit.SECONDS);
                } else if (clientId.equals(session.getLaptopSocketId())) {
                    // Laptop disconnected grace period
                    scheduler.schedule(() -> {
                        SessionInfo s = sessionService.getSession(sessionId);
                        if (s != null && clientId.equals(s.getLaptopSocketId())) {
                            sessionService.removeSession(sessionId);
                        }
                    }, 15, TimeUnit.SECONDS);
                }
            });
        });

        // 1. Laptop Inspector Station registers session
        server.addEventListener("session:init", Map.class, (client, data, ackSender) -> {
            String sessionId = data != null ? (String) data.get("sessionId") : null;
            if (sessionId == null || sessionId.isBlank()) return;

            client.joinRoom(sessionId);
            SessionInfo session = sessionService.getOrCreateSession(sessionId);
            session.setLaptopSocketId(client.getSessionId());
            System.out.println("[Session Init] Laptop joined session: " + sessionId);

            if (session.getPhoneSocketId() != null && session.getDevice() != null) {
                Map<String, Object> connectedEvent = new LinkedHashMap<>();
                connectedEvent.put("sessionId", sessionId);
                connectedEvent.put("device", session.getDevice());
                connectedEvent.put("connectedAt", new SimpleDateFormat("HH:mm:ss").format(new Date()));
                client.sendEvent("device:connected", connectedEvent);
            } else {
                Map<String, Object> readyEvent = new LinkedHashMap<>();
                readyEvent.put("sessionId", sessionId);
                readyEvent.put("status", "Waiting for mobile scanner");
                client.sendEvent("session:ready", readyEvent);
            }
        });

        // 2. Mobile Scanner joins session via QR code
        server.addEventListener("session:join", Map.class, (client, data, ackSender) -> {
            String sessionId = data != null ? (String) data.get("sessionId") : null;
            if (sessionId == null || sessionId.isBlank()) return;

            client.joinRoom(sessionId);
            SessionInfo session = sessionService.getOrCreateSession(sessionId);
            session.setPhoneSocketId(client.getSessionId());

            @SuppressWarnings("unchecked")
            Map<String, Object> deviceInfo = (Map<String, Object>) data.get("deviceInfo");
            if (deviceInfo == null) {
                deviceInfo = Map.of("name", "Mobile Scanner Unit", "model", "Handheld Scanner");
            }
            session.setDevice(deviceInfo);

            System.out.println("[Session Connected] Mobile joined session: " + sessionId);

            Map<String, Object> connectedEvent = new LinkedHashMap<>();
            connectedEvent.put("sessionId", sessionId);
            connectedEvent.put("device", deviceInfo);
            connectedEvent.put("connectedAt", new SimpleDateFormat("HH:mm:ss").format(new Date()));

            server.getRoomOperations(sessionId).sendEvent("device:connected", connectedEvent);

            Map<String, Object> joinedSuccess = new LinkedHashMap<>();
            joinedSuccess.put("sessionId", sessionId);
            joinedSuccess.put("status", "Connected to Laptop Station");
            client.sendEvent("session:joined_success", joinedSuccess);
        });

        // 3. Mobile submits scan package
        server.addEventListener("scan:submit", Map.class, (client, data, ackSender) -> {
            String sessionId = data != null ? (String) data.get("sessionId") : null;
            @SuppressWarnings("unchecked")
            Map<String, Object> scanData = (Map<String, Object>) data.get("scanData");

            System.out.println("[Scan Submitted] Session: " + sessionId + ", Product: " + (scanData != null ? scanData.get("productName") : "Unknown"));

            // Persist scan package to scratch
            try {
                File scratchDir = new File("scratch");
                if (!scratchDir.exists()) scratchDir.mkdirs();

                if (scanData != null) {
                    objectMapper.writerWithDefaultPrettyPrinter().writeValue(new File(scratchDir, "latest_scan_submitted.json"), scanData);

                    // Save to in-memory and persistent database
                    try {
                        InspectionRecord record = objectMapper.convertValue(scanData, InspectionRecord.class);
                        inspectionDatabaseService.save(record);
                        System.out.println("[InspectionDatabaseService] Saved scanned item: " + record.getId());
                    } catch (Exception e) {
                        System.err.println("[SocketIO] Failed to map scanData to InspectionRecord: " + e.getMessage());
                    }

                    String evidenceUrl = (String) scanData.get("evidenceImageUrl");
                    if (evidenceUrl != null && evidenceUrl.contains("base64,")) {
                        String b64 = evidenceUrl.replaceFirst("^data:image/\\w+;base64,", "");
                        byte[] bytes = Base64.getDecoder().decode(b64);
                        try (FileOutputStream fos = new FileOutputStream(new File(scratchDir, "latest_submitted_image.jpg"))) {
                            fos.write(bytes);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("[SocketIO] Notice: error saving submitted scan: " + e.getMessage());
            }

            // Broadcast scan to laptop station room and broadcast operations
            if (sessionId != null) {
                server.getRoomOperations(sessionId).sendEvent("scan:received", scanData);
            }
            server.getBroadcastOperations().sendEvent("scan:received", scanData);
        });

        // Start Netty-SocketIO server
        try {
            server.start();
            System.out.println("[SocketIO] Netty Socket.IO Server successfully started on port " + server.getConfiguration().getPort());
        } catch (Exception e) {
            System.err.println("[SocketIO] Failed to start Socket.IO server: " + e.getMessage());
        }
    }
}
