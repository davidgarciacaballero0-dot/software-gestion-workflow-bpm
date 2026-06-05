package com.bpm.domain.services;

import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.repositories.ArchivoAdjuntoRepository;
import org.springframework.stereotype.Service;

import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

@Service
public class CollaborativeEditService {

    private final StorageService storageService;
    private final ArchivoAdjuntoRepository archivoRepository;

    public CollaborativeEditService(StorageService storageService, ArchivoAdjuntoRepository archivoRepository) {
        this.storageService = storageService;
        this.archivoRepository = archivoRepository;
    }

    /**
     * Guarda el estado binario de Yjs en Storage Y genera una exportación a .docx
     * para que el documento sea accesible fuera del editor colaborativo.
     */
    public void saveYjsState(String archivoId, byte[] yjsState) {
        ArchivoAdjunto adjunto = archivoRepository.findById(archivoId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + archivoId));

        // 1. Guardar estado binario Yjs para reanudación del editor
        InputStream is = new ByteArrayInputStream(yjsState);
        storageService.uploadFileHierarchical(
                is,
                adjunto.getNombreOriginal() + ".yjs",
                "application/octet-stream",
                null, adjunto.getIdPolitica(), adjunto.getIdCliente(), adjunto.getIdTramiteInstancia()
        );

        // 2. Exportar contenido a formato .docx usando Apache POI
        try {
            byte[] docxBytes = exportYjsToDocx(yjsState, adjunto.getNombreOriginal());
            InputStream docxStream = new ByteArrayInputStream(docxBytes);
            String docxGridFsId = storageService.uploadFileHierarchical(
                    docxStream,
                    getDocxFilename(adjunto.getNombreOriginal()),
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    null, adjunto.getIdPolitica(), adjunto.getIdCliente(), adjunto.getIdTramiteInstancia()
            );

            // Actualizar referencia al archivo Word exportado
            adjunto.setGridFsId(docxGridFsId);
            adjunto.setContentType("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
            String originalName = adjunto.getNombreOriginal();
            if (originalName != null && !originalName.endsWith(".docx")) {
                adjunto.setNombreOriginal(getDocxFilename(originalName));
            }
            archivoRepository.save(adjunto);
            System.out.println("[CollaborativeEditService] Documento exportado a .docx: " + adjunto.getNombreOriginal());
        } catch (Exception e) {
            System.err.println("[CollaborativeEditService] Error exportando a .docx, guardando solo estado Yjs: " + e.getMessage());
            // Fallback: solo guardar estado binario sin exportar Word
            adjunto.setGridFsId(adjunto.getGridFsId()); // Mantener el ID original
            archivoRepository.save(adjunto);
        }
    }

    /**
     * Carga el estado binario de Yjs desde Storage para reanudar la edición colaborativa.
     */
    public byte[] loadYjsState(String archivoId) {
        ArchivoAdjunto adjunto = archivoRepository.findById(archivoId)
                .orElseThrow(() -> new RuntimeException("Archivo no encontrado: " + archivoId));

        try {
            InputStream is = storageService.downloadFile(adjunto.getGridFsId());
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[1024];
            while ((nRead = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            return buffer.toByteArray();
        } catch (Exception e) {
            System.err.println("Estado previo Yjs no encontrado, retornando vacío. " + e.getMessage());
            return new byte[0];
        }
    }

    /**
     * Convierte el estado binario Yjs a un documento Word (.docx).
     * Nota: El estado Yjs es un CRDT binario. Para la exportación, se extrae el texto
     * plano contenido en el estado y se formatea como documento Word con Apache POI.
     */
    private byte[] exportYjsToDocx(byte[] yjsState, String title) throws Exception {
        XWPFDocument document = new XWPFDocument();

        // Título del documento
        XWPFParagraph titleParagraph = document.createParagraph();
        titleParagraph.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.CENTER);
        XWPFRun titleRun = titleParagraph.createRun();
        titleRun.setText(title != null ? title : "Documento Colaborativo");
        titleRun.setBold(true);
        titleRun.setFontSize(16);
        titleRun.setFontFamily("Arial");

        // Separador
        document.createParagraph();

        // Extraer texto del estado Yjs (el estado binario contiene texto UTF-8 embebido)
        String extractedText = extractTextFromYjsState(yjsState);

        // Escribir contenido: cada línea como un párrafo
        String[] lines = extractedText.split("\n");
        for (String line : lines) {
            if (!line.trim().isEmpty()) {
                XWPFParagraph contentParagraph = document.createParagraph();
                XWPFRun contentRun = contentParagraph.createRun();
                contentRun.setText(line);
                contentRun.setFontSize(11);
                contentRun.setFontFamily("Arial");
            }
        }

        // Footer con metadata
        XWPFParagraph footerParagraph = document.createParagraph();
        footerParagraph.setAlignment(org.apache.poi.xwpf.usermodel.ParagraphAlignment.RIGHT);
        XWPFRun footerRun = footerParagraph.createRun();
        footerRun.setText("Exportado desde Editor Colaborativo BPM — " + java.time.LocalDateTime.now().toString());
        footerRun.setFontSize(8);
        footerRun.setItalic(true);
        footerRun.setColor("888888");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        document.write(out);
        document.close();
        return out.toByteArray();
    }

    /**
     * Extrae texto legible del estado binario Yjs.
     * El protocolo Yjs codifica texto como secuencias UTF-8 dentro del binary update.
     * Esta implementación usa una heurística para extraer runs de texto printable.
     */
    private String extractTextFromYjsState(byte[] yjsState) {
        if (yjsState == null || yjsState.length == 0) {
            return "(Documento vacío)";
        }
        
        // Heurística: buscar secuencias de caracteres UTF-8 printable en el binario
        StringBuilder text = new StringBuilder();
        int consecutivePrintable = 0;
        StringBuilder currentRun = new StringBuilder();
        
        for (byte b : yjsState) {
            char c = (char) (b & 0xFF);
            if (c >= 32 && c < 127) { // Carácter ASCII printable
                currentRun.append(c);
                consecutivePrintable++;
            } else if (c == '\n' || c == '\r') {
                if (consecutivePrintable >= 3) { // Solo agregar runs de 3+ caracteres
                    text.append(currentRun).append('\n');
                }
                currentRun = new StringBuilder();
                consecutivePrintable = 0;
            } else {
                if (consecutivePrintable >= 3) {
                    text.append(currentRun);
                }
                currentRun = new StringBuilder();
                consecutivePrintable = 0;
            }
        }
        // Agregar último run si es válido
        if (consecutivePrintable >= 3) {
            text.append(currentRun);
        }

        String result = text.toString().trim();
        return result.isEmpty() ? "(Documento vacío — contenido binario sin texto extraíble)" : result;
    }

    private String getDocxFilename(String originalName) {
        if (originalName == null) return "documento_colaborativo.docx";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            return originalName.substring(0, dotIndex) + ".docx";
        }
        return originalName + ".docx";
    }
}
