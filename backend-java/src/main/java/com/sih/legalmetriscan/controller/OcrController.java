package com.sih.legalmetriscan.controller;

import com.sih.legalmetriscan.model.OcrAnalyzeRequest;
import com.sih.legalmetriscan.model.OcrAnalyzeResponse;
import com.sih.legalmetriscan.service.OcrAnalysisService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ocr")
public class OcrController {

    private final OcrAnalysisService ocrAnalysisService;

    public OcrController(OcrAnalysisService ocrAnalysisService) {
        this.ocrAnalysisService = ocrAnalysisService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<OcrAnalyzeResponse> analyze(@RequestBody OcrAnalyzeRequest request) {
        if (request.getImage() == null || request.getImage().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        OcrAnalyzeResponse response = ocrAnalysisService.analyze(request);
        return ResponseEntity.ok(response);
    }
}
