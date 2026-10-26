package com.sih.legalmetriscan.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.util.Enumeration;
import java.util.List;
import java.util.Map;

/**
 * Single-port proxy for Socket.IO HTTP long-polling on Render.
 * 
 * Render web services only map the single public PORT (e.g. 10000) to the internet.
 * This controller intercepts incoming /socket.io/** HTTP requests on Spring Boot's port
 * and forwards them directly to the Netty-SocketIO server on localhost (port 4001).
 */
@Controller
public class SocketIOProxyController {

    @Value("${socket.server.port:4001}")
    private int socketPort;

    @RequestMapping(value = "/socket.io/**")
    public void proxySocketIO(HttpServletRequest request, HttpServletResponse response) {
        HttpURLConnection conn = null;
        try {
            String path = request.getRequestURI();
            String queryString = request.getQueryString();
            String targetUrlStr = "http://127.0.0.1:" + socketPort + path + (queryString != null ? "?" + queryString : "");

            URL targetUrl = URI.create(targetUrlStr).toURL();
            conn = (HttpURLConnection) targetUrl.openConnection();
            conn.setRequestMethod(request.getMethod());
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(60000); // 60s for long-polling
            conn.setDoInput(true);

            // Copy request headers
            Enumeration<String> headerNames = request.getHeaderNames();
            if (headerNames != null) {
                while (headerNames.hasMoreElements()) {
                    String hName = headerNames.nextElement();
                    if (!hName.equalsIgnoreCase("host") && !hName.equalsIgnoreCase("content-length")) {
                        conn.setRequestProperty(hName, request.getHeader(hName));
                    }
                }
            }

            // Copy POST / PUT body
            if ("POST".equalsIgnoreCase(request.getMethod()) || "PUT".equalsIgnoreCase(request.getMethod())) {
                conn.setDoOutput(true);
                try (InputStream in = request.getInputStream(); OutputStream out = conn.getOutputStream()) {
                    in.transferTo(out);
                    out.flush();
                }
            }

            int responseCode = conn.getResponseCode();
            response.setStatus(responseCode);

            // Copy response headers
            for (Map.Entry<String, List<String>> header : conn.getHeaderFields().entrySet()) {
                String key = header.getKey();
                if (key != null && !key.equalsIgnoreCase("transfer-encoding") && !key.equalsIgnoreCase("content-length")) {
                    for (String val : header.getValue()) {
                        response.addHeader(key, val);
                    }
                }
            }

            // Stream response content
            InputStream responseStream = (responseCode >= 400) ? conn.getErrorStream() : conn.getInputStream();
            if (responseStream != null) {
                try (InputStream in = responseStream; OutputStream out = response.getOutputStream()) {
                    in.transferTo(out);
                    out.flush();
                }
            }
        } catch (Exception e) {
            try {
                if (!response.isCommitted()) {
                    response.setStatus(HttpServletResponse.SC_BAD_GATEWAY);
                    response.getWriter().write("{\"error\":\"Socket.IO proxy error: " + e.getMessage() + "\"}");
                }
            } catch (Exception ignored) {}
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
