package com.pulsemedia.hub;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.YearMonth;
import java.time.ZoneOffset;

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

/** v1.06 admin screens: payouts, users & creators, categories, settings, CMS, analytics, publications. */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:workspacetest?mode=memory&cache=shared")
class WorkspaceAdminFlowTest {

    private static final String THIS_MONTH = YearMonth.now(ZoneOffset.UTC).toString();

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

    private ResultActions send(MockHttpServletRequestBuilder req, String token, String body) throws Exception {
        req.header("Authorization", token);
        if (body != null) {
            req.contentType(MediaType.APPLICATION_JSON).content(body);
        }
        return mvc.perform(req);
    }

    @Test
    void payoutsAreCreatedPaidOrCancelled() throws Exception {
        String admin = token("admin@pulsemedia.demo");

        // Seeded pending payout for Alex (video 3 + 5 this month).
        send(get("/api/admin/payouts"), admin, null)
                .andExpect(jsonPath("$[0].payoutCode").value("PAY-0016"))
                .andExpect(jsonPath("$[0].status").value("PENDING"))
                .andExpect(jsonPath("$[0].period").value(THIS_MONTH))
                .andExpect(jsonPath("$[0].amountCents").value(80100))
                .andExpect(jsonPath("$[0].payoutMethod").value("PayPal · alex•••@mail.com"));

        // Maya's current month: create, then cancel releases the entries again.
        send(get("/api/admin/payouts/preview?creatorId=2&period=" + THIS_MONTH), admin, null)
                .andExpect(jsonPath("$.entries").value(4))
                .andExpect(jsonPath("$.amountCents").value(126600 + 23400 + 238440 + 198660));
        long id = json.readTree(send(post("/api/admin/payouts"), admin, "{\"creatorId\":2,\"period\":\"" + THIS_MONTH + "\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        send(get("/api/admin/payouts/preview?creatorId=2&period=" + THIS_MONTH), admin, null)
                .andExpect(jsonPath("$.entries").value(0));
        send(post("/api/admin/payouts/" + id + "/cancel"), admin, null)
                .andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.entries").value(0));
        send(get("/api/admin/payouts/preview?creatorId=2&period=" + THIS_MONTH), admin, null)
                .andExpect(jsonPath("$.entries").value(4));
        send(post("/api/admin/payouts/" + id + "/paid"), admin, "{\"externalRef\":\"X\"}").andExpect(status().isConflict());

        // Settling the seeded payout locks its entries and shows up for the creator.
        send(post("/api/admin/payouts/16/paid"), admin, "{\"externalRef\":\"PAYPAL-1\"}")
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.paidAt").exists());
        send(get("/api/creator/payouts"), token("alex@pulsemedia.demo"), null)
                .andExpect(jsonPath("$[0].payoutCode").value("PAY-0016"))
                .andExpect(jsonPath("$[0].status").value("PAID"));
        send(post("/api/admin/payouts"), admin, "{\"creatorId\":2,\"period\":\"2020-01\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("There are no unpaid revenue lines for this creator and period."));
    }

    @Test
    void lastAdminIsProtectedAndSuspendedAccountsCannotSignIn() throws Exception {
        String admin = token("admin@pulsemedia.demo");
        send(get("/api/admin/users"), admin, null)
                .andExpect(jsonPath("$[0].role").value("ADMIN"))
                .andExpect(jsonPath("$[?(@.email == 'admin@pulsemedia.demo')].userCode").value("USR-001"));

        send(post("/api/admin/users"), admin, "{\"name\":\"Riley Park\",\"email\":\"riley@pulsemedia.demo\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("INVITED"));
        send(post("/api/admin/users"), admin, "{\"name\":\"Riley\",\"email\":\"RILEY@pulsemedia.demo\"}")
                .andExpect(status().isConflict());

        send(patch("/api/admin/users/2/status"), admin, "{\"status\":\"SUSPENDED\"}").andExpect(status().isBadRequest());
        send(patch("/api/admin/users/5/status"), admin, "{\"status\":\"SUSPENDED\"}")
                .andExpect(jsonPath("$.status").value("SUSPENDED"));
        send(patch("/api/admin/users/1/status"), admin, "{\"status\":\"SUSPENDED\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("The last active admin cannot be deactivated."));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ops@pulsemedia.demo\",\"password\":\"demo1234\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("This account is suspended. Contact an administrator."));

        // Creator management: share applies to new revenue, suspension blocks sign-in.
        send(patch("/api/admin/creators/3"), admin, "{\"sharePct\":101}").andExpect(status().isBadRequest());
        send(patch("/api/admin/creators/3"), admin, "{\"sharePct\":55,\"status\":\"SUSPENDED\",\"publicHidden\":true}")
                .andExpect(jsonPath("$.sharePct").value(55.0))
                .andExpect(jsonPath("$.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.publicHidden").value(true));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"jordan@pulsemedia.demo\",\"password\":\"demo1234\"}"))
                .andExpect(status().isForbidden());
        send(get("/api/admin/creators/3"), admin, null)
                .andExpect(jsonPath("$.creator.creatorCode").value("PM-CR-0003"))
                .andExpect(jsonPath("$.videos.length()").value(3))
                .andExpect(jsonPath("$.payouts.length()").value(5));
        send(get("/api/admin/audit?limit=1"), admin, null).andExpect(jsonPath("$[0].action").value("Public page hidden"));
    }

    @Test
    void categoriesSettingsCmsAndAnalytics() throws Exception {
        String admin = token("admin@pulsemedia.demo");
        String alex = token("alex@pulsemedia.demo");

        send(post("/api/admin/categories"), admin, "{\"name\":\"food\"}").andExpect(status().isConflict());
        send(patch("/api/admin/categories/6"), admin, "{\"visible\":false}")
                .andExpect(jsonPath("$.name").value("Tech"))
                .andExpect(jsonPath("$.visible").value(false));
        send(post("/api/creator/videos"), alex, "{\"title\":\"Gadgets\",\"categoryId\":6}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("This category is not available for new uploads."));
        send(get("/api/admin/categories"), admin, null).andExpect(jsonPath("$[?(@.name == 'Food')].videos").value(3));

        send(put("/api/admin/settings"), admin,
                "{\"uploadLimitGb\":2,\"storageQuotaGb\":300,\"defaultSharePct\":60,\"retentionDays\":90,\"enabledPlatforms\":[]}")
                .andExpect(status().isBadRequest());
        send(put("/api/admin/settings"), admin,
                "{\"uploadLimitGb\":4,\"storageQuotaGb\":500,\"defaultSharePct\":55,\"retentionDays\":30,\"enabledPlatforms\":[\"YouTube\",\"TikTok\"]}")
                .andExpect(jsonPath("$.uploadLimitGb").value(4))
                .andExpect(jsonPath("$.platforms[2].name").value("Instagram"))
                .andExpect(jsonPath("$.platforms[2].enabled").value(false));
        send(get("/api/settings"), alex, null).andExpect(jsonPath("$.storageQuotaGb").value(500));
        send(post("/api/admin/revenue"), admin, "{\"videoCode\":\"V-2402\",\"platform\":\"Instagram\",\"period\":\"2030-01\",\"gross\":1}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Instagram is disabled in settings."));
        send(get("/api/admin/storage"), admin, null).andExpect(jsonPath("$.originalFiles").value(8));

        send(get("/api/admin/cms"), admin, null).andExpect(jsonPath("$[0].slug").value("terms"));
        send(put("/api/admin/cms/about"), admin, "{\"title\":\"About us\",\"content\":\"Hello.\"}")
                .andExpect(jsonPath("$.title").value("About us"))
                .andExpect(jsonPath("$.updatedAt").exists());
        send(put("/api/admin/cms/nope"), admin, "{\"title\":\"X\",\"content\":\"Y\"}").andExpect(status().isNotFound());

        send(get("/api/admin/analytics?months=12"), admin, null)
                .andExpect(jsonPath("$.months", hasSize(12)))
                .andExpect(jsonPath("$.months[11]").value(THIS_MONTH))
                .andExpect(jsonPath("$.series[0].platform").value("YouTube"))
                .andExpect(jsonPath("$.series[0].grossCents", hasSize(12)))
                .andExpect(jsonPath("$.grossThisMonthCents").value(1760000))
                .andExpect(jsonPath("$.avgSharePct").value(60));
        send(get("/api/admin/analytics?months=7"), admin, null).andExpect(status().isBadRequest());
        send(get("/api/admin/dashboard"), admin, null)
                .andExpect(jsonPath("$.approvedUnpublished").value(1))
                .andExpect(jsonPath("$.storageQuotaGb").value(500))
                .andExpect(jsonPath("$.recentPublications[0].channel").exists());
    }

    @Test
    void publicationsCanBeCorrected() throws Exception {
        String admin = token("admin@pulsemedia.demo");
        send(get("/api/admin/publications"), admin, null)
                .andExpect(jsonPath("$.length()").value(12))
                .andExpect(jsonPath("$[0].channel").exists());
        send(patch("/api/admin/publications/1"), admin,
                "{\"channel\":\"PulseMedia Main\",\"url\":\"https://www.youtube.com/watch?v=9bZkp7q19f0\",\"status\":\"PUBLISHED\"}")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("This published URL is already recorded."));
        send(patch("/api/admin/publications/1"), admin,
                "{\"channel\":\"PulseMedia Shorts\",\"url\":\"https://www.youtube.com/shorts/abc123\",\"status\":\"NEEDS_ATTENTION\",\"note\":\"Claimed\"}")
                .andExpect(jsonPath("$.channel").value("PulseMedia Shorts"))
                .andExpect(jsonPath("$.status").value("NEEDS_ATTENTION"));
        send(patch("/api/admin/publications/1"), admin, "{\"url\":\"https://tiktok.com/x\",\"status\":\"PUBLISHED\"}")
                .andExpect(status().isBadRequest());
        send(get("/api/creator/publications"), token("maya@pulsemedia.demo"), null)
                .andExpect(jsonPath("$[*].creator").value(org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.is("Maya Chen"))));
    }
}
