package com.sih.legalmetriscan.controller;

import com.sih.legalmetriscan.model.InspectionRecord;
import com.sih.legalmetriscan.service.InspectionDatabaseService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inspections")
public class InspectionController {

    private final InspectionDatabaseService inspectionDatabaseService;

    public InspectionController(InspectionDatabaseService inspectionDatabaseService) {
        this.inspectionDatabaseService = inspectionDatabaseService;
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
        InspectionRecord saved = inspectionDatabaseService.save(record);
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
