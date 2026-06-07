package com.bpm.domain.services;

import com.bpm.app.config.OnlyOfficeConfig;
import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.entities.Usuario;
import com.bpm.data.repositories.UsuarioRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import java.util.HashMap;
import java.util.Map;


@Service
public class OnlyOfficeService {

    private final OnlyOfficeConfig config;
    private final SecretKey key;
    private final UsuarioRepository usuarioRepository;

    @Autowired
    public OnlyOfficeService(OnlyOfficeConfig config, UsuarioRepository usuarioRepository) {
        this.config = config;
        this.usuarioRepository = usuarioRepository;
        this.key = Keys.hmacShaKeyFor(config.getJwtSecret().getBytes(StandardCharsets.UTF_8));
    }

    public Map<String, Object> generateConfig(ArchivoAdjunto archivo, String idUsuario) {
        Map<String, Object> document = new HashMap<>();
        document.put("fileType", getFileType(archivo.getNombreOriginal()));
        long timestamp = archivo.getUpdatedAt() != null ? archivo.getUpdatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : 
                         (archivo.getCreatedAt() != null ? archivo.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() : System.currentTimeMillis());
        document.put("key", archivo.getId() + "-" + timestamp);
        document.put("title", archivo.getNombreOriginal());
        document.put("url", config.getBaseUrl() + "/api/v1/onlyoffice/download/" + archivo.getId());

        Map<String, Object> editorConfig = new HashMap<>();
        editorConfig.put("callbackUrl", config.getBaseUrl() + "/api/v1/onlyoffice/callback");
        
        Map<String, Object> user = new HashMap<>();
        user.put("id", idUsuario);
        
        String nombreCompleto = "Usuario " + idUsuario;
        if (usuarioRepository != null) {
            Usuario usr = usuarioRepository.findById(idUsuario).orElse(null);
            if (usr != null) {
                nombreCompleto = usr.getNombre() + " " + (usr.getApellidos() != null ? usr.getApellidos() : "");
            }
        }
        user.put("name", nombreCompleto.strip());
        editorConfig.put("user", user);

        Map<String, Object> configMap = new HashMap<>();
        configMap.put("document", document);
        configMap.put("documentType", getDocumentType(archivo.getNombreOriginal()));
        configMap.put("editorConfig", editorConfig);

        String token = Jwts.builder()
                .claims(configMap)
                .signWith(key)
                .compact();

        configMap.put("token", token);
        return configMap;
    }

    public boolean isValidOnlyOfficeToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getUserIdFromToken(String token) {
        try {
            io.jsonwebtoken.Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            
            java.util.Map<?, ?> payloadMap = claims;
            if (claims.containsKey("payload")) {
                Object p = claims.get("payload");
                if (p instanceof java.util.Map) {
                    payloadMap = (java.util.Map<?, ?>) p;
                }
            }

            java.util.Map<?, ?> editorConfig = (java.util.Map<?, ?>) payloadMap.get("editorConfig");
            if (editorConfig != null) {
                java.util.Map<?, ?> user = (java.util.Map<?, ?>) editorConfig.get("user");
                if (user != null) {
                    return (String) user.get("id");
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        return null;
    }

    public byte[] createBlankWord() {
        try (XWPFDocument doc = new XWPFDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            doc.createParagraph().createRun().setText("");
            doc.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error creando documento Word en blanco", e);
        }
    }

    public byte[] createBlankExcel() {
        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.createSheet("Hoja1");
            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Error creando documento Excel en blanco", e);
        }
    }

    private String getFileType(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "txt";
        return fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    }

    private String getDocumentType(String fileName) {
        String ext = getFileType(fileName);
        if (ext.matches("^(doc|docx|rtf|txt|odt)$")) return "word";
        if (ext.matches("^(xls|xlsx|ods|csv)$")) return "cell";
        if (ext.matches("^(ppt|pptx|odp)$")) return "slide";
        return "word"; // default
    }
}
