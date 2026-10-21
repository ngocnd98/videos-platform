package com.pulsemedia.hub.revenue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.revenue.RevenueDtos.CreatorBalance;
import com.pulsemedia.hub.revenue.RevenueDtos.GrossUpdate;
import com.pulsemedia.hub.revenue.RevenueDtos.ImportResult;
import com.pulsemedia.hub.revenue.RevenueDtos.NewEntry;
import com.pulsemedia.hub.revenue.RevenueDtos.NewPayout;
import com.pulsemedia.hub.revenue.RevenueDtos.Payout;
import com.pulsemedia.hub.revenue.RevenueDtos.RevenueEntry;
import com.pulsemedia.hub.revenue.RevenueDtos.RevenuePage;
import com.pulsemedia.hub.revenue.RevenueDtos.Statement;
import com.pulsemedia.hub.security.CurrentUser;

import jakarta.validation.Valid;

@RestController
public class RevenueController {

    private final RevenueService service;

    public RevenueController(RevenueService service) {
        this.service = service;
    }

    @GetMapping("/api/admin/revenue")
    RevenuePage page(@RequestParam(required = false) String period) {
        return service.page(period == null || period.isBlank() ? null : period);
    }

    @PostMapping("/api/admin/revenue")
    @ResponseStatus(HttpStatus.CREATED)
    RevenueEntry add(@AuthenticationPrincipal CurrentUser admin, @Valid @RequestBody NewEntry body) {
        return service.add(admin, body);
    }

    @PatchMapping("/api/admin/revenue/{id}")
    RevenueEntry update(@PathVariable long id, @Valid @RequestBody GrossUpdate body) {
        return service.updateGross(id, body.gross());
    }

    @DeleteMapping("/api/admin/revenue/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable long id) {
        service.delete(id);
    }

    @PostMapping("/api/admin/revenue/import")
    ImportResult importCsv(@AuthenticationPrincipal CurrentUser admin, @RequestPart("file") MultipartFile file,
                           @RequestParam(required = false) String period) throws IOException {
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        if (!name.endsWith(".csv")) {
            throw ApiException.badRequest("Upload a .csv file. Excel workbooks can be saved as CSV first.");
        }
        return service.importCsv(admin, new String(file.getBytes(), StandardCharsets.UTF_8), period);
    }

    @GetMapping("/api/admin/payouts/balances")
    List<CreatorBalance> balances() {
        return service.balances();
    }

    @GetMapping("/api/admin/payouts")
    List<Payout> payouts() {
        return service.payouts();
    }

    @PostMapping("/api/admin/payouts")
    @ResponseStatus(HttpStatus.CREATED)
    Payout pay(@AuthenticationPrincipal CurrentUser admin, @Valid @RequestBody NewPayout body) {
        return service.pay(admin, body);
    }

    @GetMapping("/api/admin/creators/{creatorId}/statement")
    Statement adminStatement(@PathVariable long creatorId, @RequestParam(required = false) String period) {
        return service.statement(creatorId, period);
    }

    @GetMapping("/api/creator/statement")
    Statement creatorStatement(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) String period) {
        return service.statement(user.creatorId(), period);
    }
}
