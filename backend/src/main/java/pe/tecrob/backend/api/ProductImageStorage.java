package pe.tecrob.backend.api;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProductImageStorage {

    private static final long MAX_IMAGE_SIZE = 5 * 1024 * 1024;
    private final Path directory;

    public ProductImageStorage(@Value("${tecrob.upload-dir:uploads/products}") String uploadDirectory) {
        this.directory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecciona una imagen");
        }
        if (image.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "La imagen no puede superar los 5 MB");
        }

        try {
            byte[] content = image.getBytes();
            String extension = detectedExtension(content);
            String filename = UUID.randomUUID() + extension;
            Files.createDirectories(directory);
            Files.write(directory.resolve(filename), content);
            return "/uploads/products/" + filename;
        } catch (ResponseStatusException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo guardar la imagen del producto", exception);
        }
    }

    public void delete(String filename) {
        if (filename == null || !filename.matches(
                "^[0-9a-fA-F-]{36}\\.(jpg|png|webp)$")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de imagen no válido");
        }
        Path image = directory.resolve(filename).normalize();
        if (!image.getParent().equals(directory)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ruta de imagen no válida");
        }
        try {
            if (!Files.deleteIfExists(image)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "La imagen no existe");
            }
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "No se pudo eliminar la imagen", exception);
        }
    }

    private static String detectedExtension(byte[] bytes) {
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4e
                && bytes[3] == 0x47 && bytes[4] == 0x0d && bytes[5] == 0x0a
                && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return ".png";
        }
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
            return ".jpg";
        }
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return ".webp";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Formato no válido. Usa una imagen JPG, PNG o WebP");
    }
}
