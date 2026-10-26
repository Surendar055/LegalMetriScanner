package com.sih.legalmetriscan.service;

import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ImageProcessingService {

    public BufferedImage decodeBase64Image(String base64String) {
        if (base64String == null || base64String.isBlank()) {
            return null;
        }
        try {
            String clean = base64String.replaceFirst("^data:image/\\w+;base64,", "");
            byte[] bytes = Base64.getDecoder().decode(clean);
            try (ByteArrayInputStream bais = new ByteArrayInputStream(bytes)) {
                return ImageIO.read(bais);
            }
        } catch (Exception e) {
            System.err.println("[ImageProcessingService] Failed to decode base64 image: " + e.getMessage());
            return null;
        }
    }

    public Map<String, Object> calculateImageQualityMetrics(BufferedImage image) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        if (image == null) {
            metrics.put("sharpness", 0.0);
            metrics.put("brightness", 128.0);
            return metrics;
        }

        int width = image.getWidth();
        int height = image.getHeight();
        int sampleW = 320;
        int sampleH = Math.max(1, Math.round(((float) height / width) * sampleW));

        // Downscale for fast sharpness & brightness analysis
        BufferedImage sample = new BufferedImage(sampleW, sampleH, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = sample.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(image, 0, 0, sampleW, sampleH, null);
        g.dispose();

        long sum = 0;
        long sumSq = 0;
        long lumSum = 0;
        long count = 0;

        for (int y = 1; y < sampleH - 1; y++) {
            for (int x = 1; x < sampleW - 1; x++) {
                int val = sample.getRaster().getSample(x, y, 0);
                lumSum += val;

                int up = sample.getRaster().getSample(x, y - 1, 0);
                int down = sample.getRaster().getSample(x, y + 1, 0);
                int left = sample.getRaster().getSample(x - 1, y, 0);
                int right = sample.getRaster().getSample(x + 1, y, 0);

                int lap = up + down + left + right - 4 * val;
                sum += lap;
                sumSq += (long) lap * lap;
                count++;
            }
        }

        double variance = count > 0 ? ((double) sumSq / count) - Math.pow((double) sum / count, 2) : 0.0;
        double brightness = count > 0 ? (double) lumSum / count : 128.0;

        metrics.put("sharpness", Math.round(variance * 10.0) / 10.0);
        metrics.put("brightness", Math.round(brightness * 10.0) / 10.0);
        return metrics;
    }

    public BufferedImage rotateImage(BufferedImage image, int angle) {
        if (image == null || angle % 360 == 0) {
            return image;
        }
        int w = image.getWidth();
        int h = image.getHeight();

        int newW = (angle == 90 || angle == 270) ? h : w;
        int newH = (angle == 90 || angle == 270) ? w : h;

        BufferedImage rotated = new BufferedImage(newW, newH, image.getType() != 0 ? image.getType() : BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = rotated.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);

        AffineTransform transform = new AffineTransform();
        transform.translate((newW - w) / 2.0, (newH - h) / 2.0);
        transform.rotate(Math.toRadians(angle), w / 2.0, h / 2.0);

        g2d.drawRenderedImage(image, transform);
        g2d.dispose();
        return rotated;
    }

    public BufferedImage toGrayscale(BufferedImage image) {
        if (image == null) return null;
        BufferedImage gray = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = gray.createGraphics();
        g.drawImage(image, 0, 0, null);
        g.dispose();
        return gray;
    }

    public BufferedImage threshold(BufferedImage grayImage, int thresholdValue) {
        if (grayImage == null) return null;
        int w = grayImage.getWidth();
        int h = grayImage.getHeight();
        BufferedImage binary = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_BINARY);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int gray = grayImage.getRaster().getSample(x, y, 0);
                binary.getRaster().setSample(x, y, 0, gray > thresholdValue ? 1 : 0);
            }
        }
        return binary;
    }
}
