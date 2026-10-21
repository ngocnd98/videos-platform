package com.pulsemedia.hub;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.YearMonth;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:sqlite:file:revenuetest?mode=memory&cache=shared")
class RevenueFlowTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    private static final String NEXT_MONTH = YearMonth.now(ZoneOffset.UTC).plusMonths(1).toString();
    private static final String THIS_MONTH = YearMonth.now(ZoneOffset.UTC).toString();

    private String token(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"demo1234\"}"))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(body).get("token").asText();
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    @Test
    void entriesImportPayoutAndStatement() throws Exception {
        String admin = token("admin@pulsemedia.demo");

        mvc.perform(get("/api/admin/revenue?period=" + THIS_MONTH).header("Authorization", admin))
                .andExpect(jsonPath("$.totals.grossCents").value(1760000))
                .andExpect(jsonPath("$.periods[0]").value(THIS_MONTH))
                .andExpect(jsonPath("$.periods.length()").value(6));

        // Manual entry: split snapshot 60% → $74.07 of $123.45 (rounded half up).
        JsonNode entry = body(mvc.perform(post("/api/admin/revenue").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"videoCode\":\"V-2406\",\"platform\":\"YouTube\",\"period\":\"" + NEXT_MONTH + "\",\"gross\":123.45}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.creatorShareCents").value(7407))
                .andExpect(jsonPath("$.status").value("PENDING")));
        long id = entry.get("id").asLong();

        mvc.perform(post("/api/admin/revenue").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"videoCode\":\"V-2406\",\"platform\":\"YouTube\",\"period\":\"" + NEXT_MONTH + "\",\"gross\":1}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/revenue").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"videoCode\":\"V-2406\",\"platform\":\"Instagram\",\"period\":\"" + NEXT_MONTH + "\",\"gross\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("V-2406 is not published on Instagram."));
        mvc.perform(post("/api/admin/revenue").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"videoCode\":\"V-2406\",\"platform\":\"TikTok\",\"period\":\"" + NEXT_MONTH + "\",\"gross\":1.234}"))
                .andExpect(status().isBadRequest());

        mvc.perform(patch("/api/admin/revenue/" + id).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gross\":200}"))
                .andExpect(jsonPath("$.grossCents").value(20000))
                .andExpect(jsonPath("$.creatorShareCents").value(12000));

        // CSV import is all-or-nothing.
        String bad = "Video title,Platform,Gross revenue\nWeekend reset routine,TikTok,\"$1,000.50\"\nNo such video,YouTube,5\n";
        mvc.perform(multipart("/api/admin/revenue/import").file(new MockMultipartFile("file", "r.csv", "text/csv", bad.getBytes()))
                        .param("period", NEXT_MONTH).header("Authorization", admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("Row 3: no published video matches “No such video”.")));
        String good = "Video ID,Video title,Platform,Gross revenue\nV-2406,,TikTok,\"$1,000.50\"\n,Tokyo in 60 seconds,instagram reels,99\n";
        mvc.perform(multipart("/api/admin/revenue/import").file(new MockMultipartFile("file", "r.csv", "text/csv", good.getBytes()))
                        .param("period", NEXT_MONTH).header("Authorization", admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imported").value(2))
                .andExpect(jsonPath("$.totals.grossCents").value(109950));

        // Payouts are per creator and month: create (PENDING) → record the transfer (PAID).
        mvc.perform(get("/api/admin/payouts/balances").header("Authorization", admin))
                .andExpect(jsonPath("$[?(@.creatorId == 1)].pendingCents").value(119220 + 12000 + 60030));
        mvc.perform(get("/api/admin/payouts/preview?creatorId=1&period=" + NEXT_MONTH).header("Authorization", admin))
                .andExpect(jsonPath("$.entries").value(2))
                .andExpect(jsonPath("$.amountCents").value(72030));
        JsonNode payout = body(mvc.perform(post("/api/admin/payouts").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"creatorId\":1,\"period\":\"" + NEXT_MONTH + "\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amountCents").value(72030))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.entries").value(2)));
        long payoutId = payout.get("id").asLong();
        mvc.perform(post("/api/admin/payouts").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"creatorId\":1,\"period\":\"" + NEXT_MONTH + "\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/payouts/" + payoutId + "/paid").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"externalRef\":\"BANK-TEST-1\",\"remarks\":\"October\"}"))
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.externalRef").value("BANK-TEST-1"));
        mvc.perform(post("/api/admin/payouts/" + payoutId + "/cancel").header("Authorization", admin))
                .andExpect(status().isConflict());

        // Paid entries are locked.
        mvc.perform(patch("/api/admin/revenue/" + id).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gross\":1}"))
                .andExpect(status().isConflict());
        mvc.perform(delete("/api/admin/revenue/" + id).header("Authorization", admin)).andExpect(status().isConflict());

        // The creator sees it as paid; the dashboard no longer shows a pending balance.
        String alex = token("alex@pulsemedia.demo");
        mvc.perform(get("/api/creator/statement?period=" + NEXT_MONTH).header("Authorization", alex))
                .andExpect(jsonPath("$.creatorCode").value("PM-CR-0001"))
                .andExpect(jsonPath("$.lines.length()").value(2))
                .andExpect(jsonPath("$.paidCents").value(12000 + 60030))
                .andExpect(jsonPath("$.pendingCents").value(0));
        mvc.perform(get("/api/creator/dashboard").header("Authorization", alex))
                .andExpect(jsonPath("$.pendingPayoutCents").value(199320));
        mvc.perform(get("/api/admin/revenue").header("Authorization", alex)).andExpect(status().isForbidden());
    }
}
