package com.pulsemedia.hub;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:dashtest?mode=memory&cache=shared")
class DashboardTest {

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
    void adminDashboardReflectsSeedData() throws Exception {
        mvc.perform(get("/api/admin/dashboard").header("Authorization", token("admin@pulsemedia.demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendingReview").value(3))
                .andExpect(jsonPath("$.reviewQueue.length()").value(3))
                .andExpect(jsonPath("$.reviewQueue[0].code").value("V-2408"))
                .andExpect(jsonPath("$.revenueByMonth.length()").value(6))
                .andExpect(jsonPath("$.revenueByMonth[0].grossCents").value(860000))
                .andExpect(jsonPath("$.revenueByMonth[5].grossCents").value(1760000))
                .andExpect(jsonPath("$.grossThisMonthCents").value(1760000))
                .andExpect(jsonPath("$.grossLastMonthCents").value(1510000))
                .andExpect(jsonPath("$.activeCreators").value(3))
                .andExpect(jsonPath("$.recentPublications[0].code").value("V-2406"));
    }

    @Test
    void creatorDashboardIsScopedToTheSignedInCreator() throws Exception {
        mvc.perform(get("/api/creator/dashboard").header("Authorization", token("alex@pulsemedia.demo")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalEarnedCents").value(771060))
                .andExpect(jsonPath("$.pendingPayoutCents").value(199320))
                .andExpect(jsonPath("$.publishedCount").value(3))
                .andExpect(jsonPath("$.videos.length()").value(6))
                .andExpect(jsonPath("$.profile.creatorCode").value("PM-CR-0001"))
                .andExpect(jsonPath("$.profile.splitPct").value(60.0));
    }

    @Test
    void creatorCannotReadAdminDashboard() throws Exception {
        mvc.perform(get("/api/admin/dashboard").header("Authorization", token("maya@pulsemedia.demo")))
                .andExpect(status().isForbidden());
    }
}
