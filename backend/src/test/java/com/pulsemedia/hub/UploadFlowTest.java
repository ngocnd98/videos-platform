package com.pulsemedia.hub;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pulsemedia.hub.storage.ObjectStorage;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:uploadtest?mode=memory&cache=shared")
class UploadFlowTest {

    @TestConfiguration
    static class Storage {
        @Bean
        @Primary
        FakeObjectStorage fakeStorage() {
            return new FakeObjectStorage();
        }
    }

    private static final long MB = 1024 * 1024;

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    FakeObjectStorage fake;

    @Autowired
    ObjectStorage storage;

    private String token(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"demo1234\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, Object body) throws Exception {
        req.header("Authorization", token);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        }
        return mvc.perform(req);
    }

    private JsonNode read(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private String newDraft(String token) throws Exception {
        var meta = java.util.Map.of("title", "City cycling", "categoryId", 1, "tags", "bike, city, bike", "durationSec", 37);
        JsonNode video = read(send(post("/api/creator/videos"), token, meta).andExpect(status().isCreated()));
        assertThat(video.get("status").asText()).isEqualTo("DRAFT");
        assertThat(video.get("tags").asText()).isEqualTo("bike,city");
        return video.get("code").asText();
    }

    @Test
    void creatorUploadsResumesAndSubmitsVideo() throws Exception {
        assertThat(storage).isSameAs(fake);
        String alex = token("alex@pulsemedia.demo");
        String code = newDraft(alex);
        assertThat(code).matches("V-24\\d\\d");

        long size = 25 * MB; // 3 parts of 10 MiB, 10 MiB, 5 MiB
        JsonNode session = read(send(post("/api/creator/videos/" + code + "/upload"), alex,
                java.util.Map.of("fileName", "city ride.mp4", "size", size, "contentType", "video/mp4"))
                .andExpect(status().isOk()));
        assertThat(session.get("partCount").asInt()).isEqualTo(3);
        String uploadId = session.get("uploadId").asText();

        send(post("/api/creator/videos/" + code + "/upload/parts"), alex, java.util.Map.of("partNumbers", java.util.List.of(1, 2, 3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].url").value(org.hamcrest.Matchers.containsString("partNumber=1")));

        // The browser uploads part 1, then the connection drops.
        String etag1 = fake.receivePart(uploadId, 1, 10 * MB);
        send(get("/api/creator/videos/" + code + "/upload"), alex, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parts.length()").value(1))
                .andExpect(jsonPath("$.parts[0].partNumber").value(1));

        // Submitting before the file is complete is refused.
        send(post("/api/creator/videos/" + code + "/submit"), alex, null).andExpect(status().isConflict());

        String etag2 = fake.receivePart(uploadId, 2, 10 * MB);
        String etag3 = fake.receivePart(uploadId, 3, 5 * MB);
        send(post("/api/creator/videos/" + code + "/upload/complete"), alex, java.util.Map.of("parts", java.util.List.of(
                java.util.Map.of("partNumber", 1, "etag", etag1),
                java.util.Map.of("partNumber", 2, "etag", etag2),
                java.util.Map.of("partNumber", 3, "etag", etag3))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.original.status").value("AVAILABLE"))
                .andExpect(jsonPath("$.original.sizeBytes").value(size));

        mvc.perform(multipart("/api/creator/videos/" + code + "/thumbnail")
                        .file(new MockMultipartFile("file", "t.jpg", "image/jpeg", new byte[] {1, 2, 3}))
                        .header("Authorization", alex))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.thumbnailUrl").value(org.hamcrest.Matchers.startsWith("https://fake-r2/")));

        send(post("/api/creator/videos/" + code + "/submit"), alex, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_REVIEW"));

        // Now visible to the admin, and locked for the creator.
        send(get("/api/admin/dashboard"), token("admin@pulsemedia.demo"), null)
                .andExpect(jsonPath("$.pendingReview").value(4))
                .andExpect(jsonPath("$.reviewQueue[0].code").value(code));
        send(post("/api/creator/videos/" + code + "/upload"), alex,
                java.util.Map.of("fileName", "again.mp4", "size", MB, "contentType", "video/mp4"))
                .andExpect(status().isConflict());
        send(get("/api/creator/videos?status=IN_REVIEW"), alex, null)
                .andExpect(jsonPath("$[0].code").value(code));
    }

    @Test
    void uploadValidationAndOwnership() throws Exception {
        String alex = token("alex@pulsemedia.demo");
        String code = newDraft(alex);

        send(post("/api/creator/videos/" + code + "/upload"), alex,
                java.util.Map.of("fileName", "big.mp4", "size", 3L * 1024 * MB, "contentType", "video/mp4"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("This video is larger than the 2 GB upload limit."));
        send(post("/api/creator/videos/" + code + "/upload"), alex,
                java.util.Map.of("fileName", "notes.pdf", "size", MB, "contentType", "application/pdf"))
                .andExpect(status().isBadRequest());

        // No session yet → resuming tells the client to start over.
        send(get("/api/creator/videos/" + code + "/upload"), alex, null).andExpect(status().isGone());

        // Another creator cannot see or touch it.
        String maya = token("maya@pulsemedia.demo");
        send(get("/api/creator/videos/" + code), maya, null).andExpect(status().isNotFound());
        send(post("/api/creator/videos/" + code + "/submit"), maya, null).andExpect(status().isNotFound());

        // Seeded published videos are locked.
        send(post("/api/creator/videos/V-2406/upload"), alex,
                java.util.Map.of("fileName", "x.mp4", "size", MB, "contentType", "video/mp4"))
                .andExpect(status().isConflict());

        send(post("/api/creator/videos"), alex, java.util.Map.of("title", " ", "categoryId", 1))
                .andExpect(status().isBadRequest());
        send(get("/api/categories"), alex, null).andExpect(jsonPath("$.length()").value(6));
    }
}
