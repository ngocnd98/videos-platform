package com.pulsemedia.hub.video;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.pulsemedia.hub.security.CurrentUser;
import com.pulsemedia.hub.video.VideoDtos.CompleteUploadRequest;
import com.pulsemedia.hub.video.VideoDtos.PartUrl;
import com.pulsemedia.hub.video.VideoDtos.PartUrlsRequest;
import com.pulsemedia.hub.video.VideoDtos.StartUploadRequest;
import com.pulsemedia.hub.video.VideoDtos.UploadSession;
import com.pulsemedia.hub.video.VideoDtos.VideoDto;
import com.pulsemedia.hub.video.VideoDtos.VideoMetadata;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/creator/videos")
public class CreatorVideoController {

    private final CreatorVideoService service;

    public CreatorVideoController(CreatorVideoService service) {
        this.service = service;
    }

    @GetMapping
    List<VideoDto> list(@AuthenticationPrincipal CurrentUser user, @RequestParam(required = false) String status) {
        return service.list(user, status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    VideoDto create(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody VideoMetadata body) {
        return service.create(user, body);
    }

    @GetMapping("/{code}")
    VideoDto get(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        return service.get(user, code);
    }

    @PutMapping("/{code}")
    VideoDto update(@AuthenticationPrincipal CurrentUser user, @PathVariable String code, @Valid @RequestBody VideoMetadata body) {
        return service.update(user, code, body);
    }

    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        service.deleteDraft(user, code);
    }

    @PostMapping("/{code}/upload")
    UploadSession startUpload(@AuthenticationPrincipal CurrentUser user, @PathVariable String code,
                              @Valid @RequestBody StartUploadRequest body) {
        return service.startUpload(user, code, body);
    }

    @GetMapping("/{code}/upload")
    UploadSession uploadStatus(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        return service.uploadStatus(user, code);
    }

    @PostMapping("/{code}/upload/parts")
    List<PartUrl> partUrls(@AuthenticationPrincipal CurrentUser user, @PathVariable String code,
                           @Valid @RequestBody PartUrlsRequest body) {
        return service.partUrls(user, code, body.partNumbers());
    }

    @PostMapping("/{code}/upload/complete")
    VideoDto complete(@AuthenticationPrincipal CurrentUser user, @PathVariable String code,
                      @Valid @RequestBody CompleteUploadRequest body) {
        return service.completeUpload(user, code, body);
    }

    @DeleteMapping("/{code}/upload")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void abort(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        service.abortUpload(user, code);
    }

    @PostMapping("/{code}/thumbnail")
    VideoDto thumbnail(@AuthenticationPrincipal CurrentUser user, @PathVariable String code,
                       @RequestPart("file") MultipartFile file) throws IOException {
        return service.saveThumbnail(user, code, file.getBytes(), file.getContentType());
    }

    @PostMapping("/{code}/withdraw")
    VideoDto withdraw(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        return service.withdraw(user, code);
    }

    @PostMapping("/{code}/submit")
    VideoDto submit(@AuthenticationPrincipal CurrentUser user, @PathVariable String code) {
        return service.submit(user, code);
    }
}
