package com.sih.legalmetriscan.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class SessionInfo {
    private String sessionId;
    private UUID laptopSocketId;
    private UUID phoneSocketId;
    private Map<String, Object> device;
    private Date createdAt = new Date();

    public SessionInfo() {}

    public SessionInfo(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public UUID getLaptopSocketId() { return laptopSocketId; }
    public void setLaptopSocketId(UUID laptopSocketId) { this.laptopSocketId = laptopSocketId; }

    public UUID getPhoneSocketId() { return phoneSocketId; }
    public void setPhoneSocketId(UUID phoneSocketId) { this.phoneSocketId = phoneSocketId; }

    public Map<String, Object> getDevice() { return device; }
    public void setDevice(Map<String, Object> device) { this.device = device; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
