package com.sih.legalmetriscan.config;

import com.corundumstudio.socketio.Configuration;
import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

@org.springframework.context.annotation.Configuration
public class SocketIOConfig {

    @Value("${socket.server.host:0.0.0.0}")
    private String host;

    @Value("${socket.server.port:4001}")
    private int port;

    private SocketIOServer server;

    @Bean
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setHostname(host);
        config.setPort(port);
        config.setMaxHttpContentLength(100_000_000); // 100 MB buffer for photo payloads
        config.setMaxFramePayloadLength(100_000_000);
        config.setOrigin("*");
        config.setPingTimeout(60000);
        config.setPingInterval(25000);

        server = new SocketIOServer(config);
        return server;
    }

    @PreDestroy
    public void stopServer() {
        if (server != null) {
            System.out.println("[SocketIOConfig] Stopping Socket.IO Server...");
            server.stop();
        }
    }
}
