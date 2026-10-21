# One image: React build is bundled into the Spring Boot jar and served from /.

FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM maven:3.9-eclipse-temurin-21 AS api
WORKDIR /api
COPY backend/pom.xml ./
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -B --no-transfer-progress -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=api /api/target/app.jar ./app.jar
# The SQLite file lives on ephemeral disk: every restart starts from the seed data.
ENV DB_PATH=/tmp/pulsemedia/app.db \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
