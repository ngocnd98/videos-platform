package com.pulsemedia.hub;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;

/** v1.06 creator side: withdraw, delete rejected, review corrections, profile and public page. */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:creatoraccounttest?mode=memory&cache=shared")
class CreatorAccountFlowTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    private String token(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    private ResultActions send(MockHttpServletRequestBuilder req, String token, String body) throws Exception {
        req.header("Authorization", token);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }

    @Test
    void reviewCorrectionWithdrawAndDelete() throws Exception {
        String admin = token("admin@pulsemedia.demo", "demo1234");
        String maya = token("maya@pulsemedia.demo", "demo1234");
        String jordan = token("jordan@pulsemedia.demo", "demo1234");

        send(get("/api/admin/reviews"), admin, null)
                .andExpect(jsonPath("$[?(@.code == 'V-2398')].creatorCountry").value("SG"));
        send(patch("/api/admin/reviews/V-2398"), admin, "{\"title\":\"The perfect pour-over\",\"categoryId\":2,\"tags\":\"coffee, brew\"}")
                .andExpect(jsonPath("$.tags").value("coffee,brew"));

        // Maya withdraws her submission; the reviewer can no longer correct or decide it.
        send(post("/api/creator/videos/V-2398/withdraw"), maya, null).andExpect(jsonPath("$.status").value("DRAFT"));
        send(post("/api/creator/videos/V-2398/withdraw"), maya, null).andExpect(status().isConflict());
        send(patch("/api/admin/reviews/V-2398"), admin, "{\"title\":\"X\",\"categoryId\":2}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("This video is no longer waiting for review."));

        // Rejected videos can be deleted by their creator.
        send(post("/api/admin/videos/V-2391/reject"), admin, "{\"reason\":\"Community guidelines\"}").andExpect(status().isNoContent());
        send(delete("/api/creator/videos/V-2391"), jordan, null).andExpect(status().isNoContent());
        send(get("/api/creator/videos/V-2391"), jordan, null).andExpect(status().isNotFound());

        send(post("/api/creator/videos"), maya, "{\"title\":\"Too many\",\"categoryId\":2,\"tags\":\"a,b,c,d,e,f,g,h,i,j,k\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A video can have up to 10 tags."));
        send(post("/api/creator/videos"), maya, "{\"title\":\"Language\",\"categoryId\":2,\"language\":\"Spanish\"}")
                .andExpect(jsonPath("$.language").value("Spanish"));
    }

    @Test
    void profileUpdateAndPublicPage() throws Exception {
        String alex = token("alex@pulsemedia.demo", "demo1234");
        send(get("/api/creator/profile"), alex, null)
                .andExpect(jsonPath("$.slug").value("alex-rivers"))
                .andExpect(jsonPath("$.sharePct").value(60.0));

        send(put("/api/creator/profile"), alex, "{\"displayName\":\"Alex Rivers\",\"slug\":\"maya-chen\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("That profile URL is taken."));
        send(put("/api/creator/profile"), alex,
                "{\"displayName\":\"Alex R.\",\"slug\":\"alex-r\",\"country\":\"CA\",\"bio\":\"Hi\",\"socialLinks\":\"@alex\","
                        + "\"payoutMethod\":\"Wise · alex@mail.com\",\"newPassword\":\"newsecret1\"}")
                .andExpect(jsonPath("$.displayName").value("Alex R."))
                .andExpect(jsonPath("$.country").value("CA"))
                .andExpect(jsonPath("$.payoutMethod").value("Wise · alex@mail.com"));
        token("alex@pulsemedia.demo", "newsecret1");

        send(get("/api/creator/public-profile"), alex, null)
                .andExpect(jsonPath("$.hidden").value(false))
                .andExpect(jsonPath("$.videos.length()").value(3))
                .andExpect(jsonPath("$.videos[?(@.code == 'V-2406')].platform").value("YouTube"));
    }
}
