package pe.tecrob.backend.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

class ProductImageStorageTest {

    @TempDir
    Path temporaryDirectory;

    @Test
    void storesPngWithGeneratedName() throws Exception {
        ProductImageStorage storage = new ProductImageStorage(temporaryDirectory.toString());
        byte[] pngHeader = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        MockMultipartFile image = new MockMultipartFile("imagen", "product.png", "image/png", pngHeader);

        String path = storage.store(image);
        String filename = path.substring(path.lastIndexOf('/') + 1);

        assertTrue(filename.matches("^[0-9a-fA-F-]{36}\\.png$"));
        assertTrue(Files.exists(temporaryDirectory.resolve(filename)));
    }

    @Test
    void rejectsUnsupportedContent() {
        ProductImageStorage storage = new ProductImageStorage(temporaryDirectory.toString());
        MockMultipartFile image = new MockMultipartFile("imagen", "product.svg", "image/svg+xml",
                "<svg/>".getBytes());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> storage.store(image));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }

    @Test
    void rejectsUnsafeDeletePath() {
        ProductImageStorage storage = new ProductImageStorage(temporaryDirectory.toString());

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class, () -> storage.delete("../outside.png"));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
    }
}
