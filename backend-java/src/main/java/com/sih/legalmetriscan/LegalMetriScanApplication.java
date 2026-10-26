package com.sih.legalmetriscan;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class LegalMetriScanApplication {
    public static void main(String[] args) {
        SpringApplication.run(LegalMetriScanApplication.class, args);
        System.out.println("\n=======================================================");
        System.out.println("  LegalMetriScan Spring Boot Backend Service Started");
        System.out.println("  REST Endpoints:  http://localhost:4000/api/...");
        System.out.println("  Socket.IO:       http://localhost:4001");
        System.out.println("=======================================================\n");
    }
}
