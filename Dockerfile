# Multi-stage Dockerfile for LegalMetriScan Java Spring Boot Backend
# Stage 1: Build application with Maven and Java 21
FROM eclipse-temurin:21-jdk-jammy AS builder
WORKDIR /app

# Install maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy Maven POM files and Java source
COPY pom.xml .
COPY backend-java/pom.xml backend-java/
COPY backend-java/src backend-java/src

# Package application jar
RUN mvn clean package -DskipTests -f backend-java/pom.xml

# Stage 2: Minimal runtime image
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Create scratch directory for diagnostic evidence dumps and persistent data
RUN mkdir -p /app/scratch /app/data

# Copy jar from builder stage
COPY --from=builder /app/backend-java/target/legalmetriscan-backend-1.0.0.jar app.jar

# Render assigns port dynamically via $PORT
ENV PORT=10000
EXPOSE ${PORT} 4001

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
