package com.pulsemedia.hub;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:reviewtest?mode=memory&cache=shared")
class ReviewFlowTest {

    @TestConfiguration
    static class Storage {
        @Bean
        @Primary
        FakeObjectStorage fakeStorage() {
            return new FakeObjectStorage();
        }
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    private String token(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"demo1234\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    @Test
    void adminApprovesAndRejectsFromTheQueue() throws Exception {
        String admin = token("admin@pulsemedia.demo");

        mvc.perform(get("/api/admin/reviews").header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].code").value("V-2391")); // oldest submission first

        mvc.perform(get("/api/admin/reviews/V-2408").header("Authorization", admin))
                .andExpect(jsonPath("$.previewUrl").value(startsWith("https://fake-r2/seed/sample-a.mp4")))
                .andExpect(jsonPath("$.creator").value("Alex Rivers"));

        mvc.perform(post("/api/admin/videos/V-2408/approve").header("Authorization", admin))
                .andExpect(status().isNoContent());
        // Second decision on the same video is refused.
        mvc.perform(post("/api/admin/videos/V-2408/approve").header("Authorization", admin))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/admin/videos/V-2398/reject").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"Made up\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/admin/videos/V-2398/reject").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Low resolution or video quality\",\"note\":\"Please export in 1080p.\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/admin/reviews").header("Authorization", admin))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/admin/audit?limit=2").header("Authorization", admin))
                .andExpect(jsonPath("$[0].action").value("Rejected"))
                .andExpect(jsonPath("$[0].detail").value("Low resolution or video quality · Please export in 1080p."))
                .andExpect(jsonPath("$[0].actor").value("Morgan Hale"))
                .andExpect(jsonPath("$[1].action").value("Approved"));

        // The creators see the outcome, including the feedback.
        mvc.perform(get("/api/creator/videos/V-2408").header("Authorization", token("alex@pulsemedia.demo")))
                .andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/creator/videos/V-2398").header("Authorization", token("maya@pulsemedia.demo")))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Low resolution or video quality · Please export in 1080p."));
    }

    @Test
    void creatorsCannotModerate() throws Exception {
        String alex = token("alex@pulsemedia.demo");
        mvc.perform(get("/api/admin/reviews").header("Authorization", alex)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/videos/V-2391/approve").header("Authorization", alex)).andExpect(status().isForbidden());
    }
}
