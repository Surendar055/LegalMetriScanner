package com.sih.legalmetriscan.service;

import com.sih.legalmetriscan.model.SessionInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
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
        String localIp = networkService.getLocalNetworkIp();
        String randomHex = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String sessionId = "LMS-" + randomHex;
        String mobileUrl = "https://" + localIp + ":" + vitePort + "/?sessionId=" + sessionId + "&mode=mobile";

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
