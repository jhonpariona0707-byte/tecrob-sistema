package pe.tecrob.backend.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            SecurityContextRepository securityContextRepository) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/login")
    @Transactional
    public Map<String, Object> login(
            @RequestBody Map<String, String> credentials,
            HttpServletRequest request,
            HttpServletResponse response) {
        String email = credentials.getOrDefault("email", "").trim();
        String password = credentials.getOrDefault("password", "");
        java.util.List<Map<String, Object>> users = jdbc.query("""
                SELECT id_usuario, nombre, email, password, rol
                FROM usuarios WHERE email=? AND activo=1
                """, rs -> {
            java.util.List<Map<String, Object>> rows = new java.util.ArrayList<>();
            while (rs.next()) {
                Map<String, Object> row = new java.util.HashMap<>();
                row.put("id", rs.getInt("id_usuario"));
                row.put("nombre", rs.getString("nombre"));
                row.put("email", rs.getString("email"));
                row.put("password", rs.getString("password"));
                row.put("rol", rs.getString("rol"));
                rows.add(row);
            }
            return rows;
        }, email);

        if (users.isEmpty() || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }

        Map<String, Object> user = users.get(0);
        String storedPassword = (String) user.get("password");
        boolean validPassword = storedPassword.startsWith("$2")
                ? passwordEncoder.matches(password, storedPassword)
                : MessageDigest.isEqual(password.getBytes(StandardCharsets.UTF_8),
                        storedPassword.getBytes(StandardCharsets.UTF_8));
        if (!validPassword) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Correo o contraseña incorrectos");
        }
        if (!storedPassword.startsWith("$2")) {
            jdbc.update("UPDATE usuarios SET password=? WHERE id_usuario=?",
                    passwordEncoder.encode(password), user.get("id"));
        }

        Map<String, Object> publicUser = new java.util.HashMap<>();
        publicUser.put("id", user.get("id"));
        publicUser.put("nombre", user.get("nombre"));
        publicUser.put("email", user.get("email"));
        publicUser.put("rol", user.get("rol"));
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                email, null, java.util.List.of(new SimpleGrantedAuthority(
                        "ROLE_" + String.valueOf(user.get("rol")).toUpperCase())));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        request.getSession(true).setAttribute("tecrobUsuario", publicUser);
        request.changeSessionId();
        securityContextRepository.saveContext(context, request, response);
        return publicUser;
    }

    @GetMapping("/session")
    public Map<String, Object> session(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null || !(session.getAttribute("tecrobUsuario") instanceof Map<?, ?> user)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión expiró");
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> publicUser = (Map<String, Object>) user;
        return publicUser;
    }

    @PostMapping("/logout")
    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }
}
