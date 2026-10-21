package com.pulsemedia.hub.accounts;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pulsemedia.hub.accounts.AccountsDtos.AdminCreator;
import com.pulsemedia.hub.accounts.AccountsDtos.CreatorDetail;
import com.pulsemedia.hub.accounts.AccountsDtos.CreatorUpdate;
import com.pulsemedia.hub.accounts.AccountsDtos.NewAdmin;
import com.pulsemedia.hub.accounts.AccountsDtos.WorkspaceUser;
import com.pulsemedia.hub.common.ApiException;
import com.pulsemedia.hub.common.AuditLog;
import com.pulsemedia.hub.revenue.RevenueRepository;
import com.pulsemedia.hub.security.CurrentUser;

/**
 * Two roles only: admins are invited by other admins, creators register themselves. Admin accounts are
 * managed in Users & roles, creator accounts (status, share, public page) in Creator management.
 */
@Service
public class AccountsService {

    private static final Set<String> SETTABLE_STATUSES = Set.of("ACTIVE", "SUSPENDED");

    private final AccountsRepository repo;
    private final RevenueRepository revenue;
    private final PasswordEncoder passwordEncoder;
    private final AuditLog audit;

    public AccountsService(AccountsRepository repo, RevenueRepository revenue, PasswordEncoder passwordEncoder, AuditLog audit) {
        this.repo = repo;
        this.revenue = revenue;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
    }

    public List<WorkspaceUser> users() {
        return repo.users();
    }

    @Transactional
    public WorkspaceUser inviteAdmin(CurrentUser admin, NewAdmin req) {
        if (repo.emailTaken(req.email())) {
            throw ApiException.conflict("A user with this email already exists.");
        }
        // The invitee sets a password from the (not yet built) invitation email, so this one is never shared.
        long id = repo.insertInvitedAdmin(req.name(), req.email(), passwordEncoder.encode(UUID.randomUUID().toString()));
        WorkspaceUser user = repo.user(id).orElseThrow();
        audit.record("USER", user.userCode(), user.name(), "Admin invited", "Invitation sent to " + user.email() + ".", admin.id());
        return user;
    }

    @Transactional
    public WorkspaceUser setAdminStatus(CurrentUser admin, long userId, String status) {
        requireSettable(status);
        WorkspaceUser user = repo.user(userId).orElseThrow(() -> ApiException.notFound("User not found."));
        if (!"ADMIN".equals(user.role())) {
            throw ApiException.badRequest("Manage creator accounts in Creator management.");
        }
        if ("ACTIVE".equals(user.status()) && !"ACTIVE".equals(status) && repo.activeAdmins() <= 1) {
            throw ApiException.conflict("The last active admin cannot be deactivated.");
        }
        if (!status.equals(user.status())) {
            repo.setStatus(userId, status);
            audit.record("USER", user.userCode(), user.name(), "Admin access changed",
                    "Account status set to " + label(status) + ".", admin.id());
        }
        return repo.user(userId).orElseThrow();
    }

    public List<AdminCreator> creators() {
        return repo.creators();
    }

    public CreatorDetail creatorDetail(long creatorId) {
        AdminCreator creator = creator(creatorId);
        return new CreatorDetail(creator, repo.latestVideos(creatorId, 5), revenue.creatorPayouts(creatorId));
    }

    @Transactional
    public AdminCreator updateCreator(CurrentUser admin, long creatorId, CreatorUpdate req) {
        AdminCreator creator = creator(creatorId);
        if (req.sharePct() != null) {
            double share = req.sharePct();
            if (share < 0 || share > 100 || Double.isNaN(share)) {
                throw ApiException.badRequest("Enter a creator share between 0 and 100%.");
            }
            if (share != creator.sharePct()) {
                repo.setShare(creatorId, share);
                audit.record("CREATOR", creator.creatorCode(), creator.name(), "Revenue share changed",
                        "New revenue will use a " + pct(share) + "% creator share; historical entries are unchanged.", admin.id());
            }
        }
        if (req.status() != null) {
            requireSettable(req.status());
            if (!req.status().equals(creator.status())) {
                repo.setStatus(creator.userId(), req.status());
                audit.record("CREATOR", creator.creatorCode(), creator.name(), "Account status changed",
                        "Creator account set to " + label(req.status()) + ".", admin.id());
            }
        }
        if (req.publicHidden() != null && req.publicHidden() != creator.publicHidden()) {
            repo.setPublicHidden(creatorId, req.publicHidden());
            audit.record("CREATOR", creator.creatorCode(), creator.name(),
                    req.publicHidden() ? "Public page hidden" : "Public page restored",
                    "Creator public profile visibility changed.", admin.id());
        }
        return creator(creatorId);
    }

    private AdminCreator creator(long creatorId) {
        return repo.creator(creatorId).orElseThrow(() -> ApiException.notFound("Creator not found."));
    }

    private static void requireSettable(String status) {
        if (!SETTABLE_STATUSES.contains(status)) {
            throw ApiException.badRequest("status must be ACTIVE or SUSPENDED.");
        }
    }

    private static String label(String status) {
        return status.charAt(0) + status.substring(1).toLowerCase();
    }

    private static String pct(double share) {
        return share == Math.rint(share) ? String.valueOf((long) share) : String.valueOf(share);
    }
}
