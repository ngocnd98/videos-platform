package com.pulsemedia.hub;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:publishtest?mode=memory&cache=shared")
class PublishingFlowTest {

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

    private String admin() throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@pulsemedia.demo\",\"password\":\"demo1234\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    private ResultActions publish(String token, String code, String body) throws Exception {
        return mvc.perform(post("/api/admin/videos/" + code + "/publications").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    void adminDownloadsOriginalAndRecordsLinks() throws Exception {
        String admin = admin();

        mvc.perform(get("/api/admin/publishing/videos?status=APPROVED").header("Authorization", admin))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].code").value("V-2407"))
                .andExpect(jsonPath("$[0].hasOriginal").value(true));

        mvc.perform(get("/api/admin/videos/V-2407/download-url").header("Authorization", admin))
                .andExpect(jsonPath("$.url").value(startsWith("https://fake-r2/seed/sample-b.mp4?download=three-recipes.mp4")));

        publish(admin, "V-2407", """
                {"publications":[{"platform":"YouTube","url":"https://youtube.com/watch"},
                                 {"platform":"TikTok","url":"https://www.tiktok.com/@alex/video/123"}]}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Enter a valid YouTube URL."));

        publish(admin, "V-2407", """
                {"publications":[{"platform":"YouTube","url":"https://youtube.com/shorts/abc123"},
                                 {"platform":"TikTok","url":"https://www.tiktok.com/@alex/video/123"}],
                 "note":"Posted at 9am"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.firstPublishedAt").isNotEmpty())
                .andExpect(jsonPath("$.platforms.length()").value(2));

        // Recording the same platform again corrects the link instead of duplicating it.
        publish(admin, "V-2407", """
                {"publications":[{"platform":"YouTube","url":"https://youtu.be/xyz789"}]}""")
                .andExpect(jsonPath("$.platforms.length()").value(2))
                .andExpect(jsonPath("$.platforms[0].url").value("https://youtu.be/xyz789"));

        mvc.perform(get("/api/admin/publishing/videos?status=APPROVED").header("Authorization", admin))
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/admin/publishing/summary").header("Authorization", admin))
                .andExpect(jsonPath("$[1].platform").value("TikTok"))
                .andExpect(jsonPath("$[1].videos").value(5));
        mvc.perform(get("/api/admin/publishing/export.csv").header("Authorization", admin))
                .andExpect(content().string(startsWith("Video ID,Title,Creator,Platform,URL")))
                .andExpect(content().string(containsString("V-2407,3 recipes in 30 seconds,Alex Rivers,YouTube,https://youtu.be/xyz789")));
        mvc.perform(get("/api/admin/audit?limit=1").header("Authorization", admin))
                .andExpect(jsonPath("$[0].detail").value("Published to YouTube"));
    }

    @Test
    void videosMustBeApprovedFirst() throws Exception {
        publish(admin(), "V-2408", """
                {"publications":[{"platform":"YouTube","url":"https://youtube.com/shorts/abc"}]}""")
                .andExpect(status().isConflict());
    }
}
