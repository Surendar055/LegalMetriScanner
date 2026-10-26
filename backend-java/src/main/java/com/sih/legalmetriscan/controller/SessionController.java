package com.sih.legalmetriscan.controller;

import com.sih.legalmetriscan.service.SessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @GetMapping("/session/new")
    public ResponseEntity<Map<String, Object>> createSession() {
        return ResponseEntity.ok(sessionService.createNewSession());
    }

    @GetMapping("/network-info")
    public ResponseEntity<Map<String, Object>> getNetworkInfo() {
        return ResponseEntity.ok(sessionService.getNetworkInfo());
    }
}
