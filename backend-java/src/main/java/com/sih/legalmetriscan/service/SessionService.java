package com.sih.legalmetriscan.service;

import com.sih.legalmetriscan.model.SessionInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class SessionService {

    @Value("${server.port:4000}")
    private int backendPort;

    @Value("${vite.port:5173}")
    private int vitePort;

    private final NetworkService networkService;
    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    public SessionService(NetworkService networkService) {
        this.networkService = networkService;
    }

    public Map<String, Object> createNewSession() {
        return createNewSession(null);
    }

    public Map<String, Object> createNewSession(jakarta.servlet.http.HttpServletRequest request) {
        String localIp = networkService.getLocalNetworkIp();
        String randomHex = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String sessionId = "LMS-" + randomHex;

        String baseUrl = System.getenv("PUBLIC_FRONTEND_URL");
        if (baseUrl == null || baseUrl.isBlank()) {
            if (request != null) {
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.isBlank()) {
                    baseUrl = origin;
                } else {
                    String referer = request.getHeader("Referer");
                    if (referer != null && referer.startsWith("http")) {
                        try {
                            java.net.URI uri = java.net.URI.create(referer);
                            baseUrl = uri.getScheme() + "://" + uri.getAuthority();
                        } catch (Exception ignored) {}
                    }
                }
            }
        }

        String mobileUrl;
        if (baseUrl != null && !baseUrl.isBlank() && !baseUrl.contains("localhost") && !baseUrl.contains("127.0.0.1")) {
            mobileUrl = baseUrl.replaceAll("/+$", "") + "/?sessionId=" + sessionId + "&mode=mobile";
        } else {
            mobileUrl = "https://" + localIp + ":" + vitePort + "/?sessionId=" + sessionId + "&mode=mobile";
        }

        SessionInfo session = new SessionInfo(sessionId);
        sessions.put(sessionId, session);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sessionId", sessionId);
        response.put("localIp", localIp);
        response.put("backendPort", backendPort);
        response.put("vitePort", vitePort);
        response.put("mobileUrl", mobileUrl);
        return response;
    }

    public Map<String, Object> getNetworkInfo() {
        String localIp = networkService.getLocalNetworkIp();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("localIp", localIp);
        response.put("backendPort", backendPort);
        response.put("vitePort", vitePort);
        return response;
    }

    public SessionInfo getSession(String sessionId) {
        return sessions.get(sessionId);
    }

    public SessionInfo getOrCreateSession(String sessionId) {
        return sessions.computeIfAbsent(sessionId, SessionInfo::new);
    }

    public void removeSession(String sessionId) {
        sessions.remove(sessionId);
    }

    private final Map<String, List<SseEmitter>> sseEmitters = new ConcurrentHashMap<>();

    public SseEmitter registerSseEmitter(String sessionId) {
        String key = (sessionId != null && !sessionId.isBlank()) ? sessionId : "ALL";
        SseEmitter emitter = new SseEmitter(1_800_000L); // 30 minutes
        List<SseEmitter> list = sseEmitters.computeIfAbsent(key, k -> new CopyOnWriteArrayList<>());
        list.add(emitter);

        emitter.onCompletion(() -> list.remove(emitter));
        emitter.onTimeout(() -> list.remove(emitter));
        emitter.onError((e) -> list.remove(emitter));

        try {
            emitter.send(SseEmitter.event()
                    .name("connection:ready")
                    .data(Map.of("sessionId", key, "status", "connected", "portMode", "single-port-sse")));
        } catch (Exception ignored) {}

        return emitter;
    }

    public void broadcastEvent(String sessionId, String eventName, Object data) {
        if (sessionId != null && !sessionId.isBlank()) {
            List<SseEmitter> list = sseEmitters.get(sessionId);
            if (list != null && !list.isEmpty()) {
                for (SseEmitter emitter : list) {
                    try {
                        emitter.send(SseEmitter.event().name(eventName).data(data));
                    } catch (Exception e) {
                        list.remove(emitter);
                    }
                }
            }
        }
        // Broadcast to general listeners
        List<SseEmitter> globalList = sseEmitters.get("ALL");
        if (globalList != null && !globalList.isEmpty()) {
            for (SseEmitter emitter : globalList) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (Exception e) {
                    globalList.remove(emitter);
                }
            }
        }
    }

    public Optional<Map.Entry<String, SessionInfo>> findSessionBySocketId(UUID socketId) {
        for (Map.Entry<String, SessionInfo> entry : sessions.entrySet()) {
            SessionInfo info = entry.getValue();
            if (socketId.equals(info.getPhoneSocketId()) || socketId.equals(info.getLaptopSocketId())) {
                return Optional.of(entry);
            }
        }
        return Optional.empty();
    }
}
