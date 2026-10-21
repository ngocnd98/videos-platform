package com.pulsemedia.hub.video;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pulsemedia.hub.video.VideoDtos.Category;

@RestController
public class CategoryController {

    private final VideoRepository videos;

    public CategoryController(VideoRepository videos) {
        this.videos = videos;
    }

    @GetMapping("/api/categories")
    List<Category> categories() {
        return videos.categories();
    }
}
