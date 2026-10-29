package pe.tecrob.backend.api;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/productos/imagenes")
public class ProductImageController {

    private final ProductImageStorage storage;

    public ProductImageController(ProductImageStorage storage) {
        this.storage = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestParam("imagen") MultipartFile image) {
        return Map.of("imagen", storage.store(image));
    }

    @DeleteMapping("/{filename}")
    public void delete(@PathVariable String filename) {
        storage.delete(filename);
    }
}
