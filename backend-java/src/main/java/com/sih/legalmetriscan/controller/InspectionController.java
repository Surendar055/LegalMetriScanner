package com.sih.legalmetriscan.controller;

import com.corundumstudio.socketio.SocketIOServer;
import com.sih.legalmetriscan.model.InspectionRecord;
import com.sih.legalmetriscan.service.InspectionDatabaseService;
import com.sih.legalmetriscan.service.SessionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionDatabaseService inspectionDatabaseService;
    private final SessionService sessionService;
    private final SocketIOServer socketIOServer;

    public InspectionController(InspectionDatabaseService inspectionDatabaseService,
                                SessionService sessionService,
                                @Autowired(required = false) SocketIOServer socketIOServer) {
        this.inspectionDatabaseService = inspectionDatabaseService;
        this.sessionService = sessionService;
        this.socketIOServer = socketIOServer;
    }

    @GetMapping
    public ResponseEntity<List<InspectionRecord>> getAllInspections() {
        return ResponseEntity.ok(inspectionDatabaseService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InspectionRecord> getInspectionById(@PathVariable String id) {
        return inspectionDatabaseService.getById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<InspectionRecord> createInspection(@RequestBody InspectionRecord record) {
        long t0 = System.currentTimeMillis();
        InspectionRecord saved = inspectionDatabaseService.save(record);
        long saveDuration = System.currentTimeMillis() - t0;
        System.out.printf("[Backend-DB][%s] Saved inspection record in %dms (status: %s, product: %s)%n",
                saved.getId(), saveDuration, saved.getStatus(), saved.getProductName());

        // Single-Port Delivery: Broadcast to desktop station via Server-Sent Events (SSE)
        try {
            sessionService.broadcastEvent(record.getSessionId(), "scan:received", saved);
            System.out.printf("[Backend-SSE][%s] Broadcast scan:received to session %s%n", saved.getId(), record.getSessionId());
        } catch (Exception e) {
            System.err.printf("[Backend-SSE][%s] Notice: SSE broadcast warning: %s%n", saved.getId(), e.getMessage());
        }

        // Dual Delivery: Also broadcast to desktop station via Socket.IO
        if (socketIOServer != null) {
            try {
                socketIOServer.getBroadcastOperations().sendEvent("scan:received", saved);
                System.out.printf("[Backend-SocketIO][%s] Broadcast scan:received to all station listeners%n", saved.getId());
            } catch (Exception e) {
                System.err.printf("[Backend-SocketIO][%s] Notice: Socket.IO broadcast warning: %s%n", saved.getId(), e.getMessage());
            }
        }

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv() {
        String csv = inspectionDatabaseService.exportCsv();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"LegalMetriScan_All_Items.csv\"")
                .contentType(MediaType.parseMediaType("text/csv;charset=utf-8"))
                .body(csv);
    }
}
