package com.sih.legalmetriscan.controller;

import com.corundumstudio.socketio.SocketIOServer;
import com.sih.legalmetriscan.service.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SessionController {

    private final SessionService sessionService;
    private final SocketIOServer socketIOServer;

    public SessionController(SessionService sessionService,
                             @Autowired(required = false) SocketIOServer socketIOServer) {
        this.sessionService = sessionService;
        this.socketIOServer = socketIOServer;
    }

    @GetMapping("/session/new")
    public ResponseEntity<Map<String, Object>> createSession(HttpServletRequest request) {
        return ResponseEntity.ok(sessionService.createNewSession(request));
    }

    @GetMapping(value = "/session/{sessionId}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSessionEvents(@PathVariable String sessionId) {
        return sessionService.registerSseEmitter(sessionId);
    }

    @PostMapping("/session/{sessionId}/join")
    public ResponseEntity<Map<String, Object>> joinSession(@PathVariable String sessionId,
                                                           @RequestBody(required = false) Map<String, Object> body) {
        Object deviceInfo = body != null && body.containsKey("deviceInfo") ? body.get("deviceInfo") : body;
        System.out.printf("[Backend-Session] Device paired to session %s: %s%n", sessionId, deviceInfo);

        // Notify SSE subscribers (single-port architecture)
        sessionService.broadcastEvent(sessionId, "device:connected", deviceInfo);

        // Notify Netty-SocketIO subscribers
        if (socketIOServer != null) {
            try {
                socketIOServer.getBroadcastOperations().sendEvent("device:connected", deviceInfo);
            } catch (Exception ignored) {}
        }

        return ResponseEntity.ok(Map.of("success", true, "sessionId", sessionId, "status", "paired"));
    }

    @GetMapping("/network-info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo() {
        return ResponseEntity.ok(sessionService.getNetworkInfo());
    }
}
