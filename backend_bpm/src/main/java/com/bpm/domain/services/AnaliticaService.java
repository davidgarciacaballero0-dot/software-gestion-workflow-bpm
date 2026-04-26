package com.bpm.domain.services;

import com.bpm.data.entities.Usuario;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnaliticaService {

    private final TramiteInstanciaRepository tramiteRepository;
    private final DepartamentoRepository departamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EventoHistorialRepository historialRepository;
    private final com.bpm.data.repositories.PoliticaWorkflowRepository politicaRepository;

    public List<MetricDataDTO> calcularMetricasDepartamentales() {
        return departamentoRepository.findAll().stream().map(dept -> {
            List<TramiteInstancia> tramites = tramiteRepository.findByDepartamentoActualId(dept.getId());
            List<Usuario> personal = usuarioRepository.findByIdDepartamento(dept.getId());

            double tiempoPromedio = tramites.stream()
                    .mapToLong(t -> {
                        LocalDateTime start = t.getCreatedAt() != null ? t.getCreatedAt() : LocalDateTime.now();
                        Duration duration = Duration.between(start, LocalDateTime.now());
                        return duration.toHours();
                    })
                    .average()
                    .orElse(0.0);

            return MetricDataDTO.builder()
                    .departamentoId(dept.getId())
                    .nombreDepartamento(dept.getNombre())
                    .tiempoPromedioHoras(tiempoPromedio)
                    .cantidadTramites(tramites.size())
                    .capacidadPersonal(personal.size())
                    .retrasosSla(0) // Tiempo real no calcula históricos
                    .build();
        }).collect(Collectors.toList());
    }

    public List<MetricDataDTO> calcularMetricasHistoricas(int meses, String departamentoId, String politicaId) {
        LocalDateTime desde = LocalDateTime.now().minusMonths(meses);

        return departamentoRepository.findAll().stream()
            .filter(d -> departamentoId == null || d.getId().equals(departamentoId))
            .map(dept -> {
                // Cantidad de trámites creados en el periodo
                long total = tramiteRepository.findAll().stream()
                    .filter(t -> t.getDepartamentoActualId() != null && t.getDepartamentoActualId().equals(dept.getId()))
                    .filter(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(desde))
                    .count();

                // Cantidad de retrasos detectados en el historial
                long retrasos = historialRepository.findByExcedioSLATrueAndCreatedAtAfter(desde).stream()
                    .filter(e -> dept.getNombre().equals(e.getNodoDestinoNombre()))
                    .count();

                List<Usuario> personal = usuarioRepository.findByIdDepartamento(dept.getId());

                return MetricDataDTO.builder()
                    .departamentoId(dept.getId())
                    .nombreDepartamento(dept.getNombre())
                    .cantidadTramites((int) total)
                    .retrasosSla((int) retrasos)
                    .capacidadPersonal(personal.size())
                    .build();
            }).collect(Collectors.toList());
    }

    public void reasignarPersonal(String idDestino, List<String> userIds) {
        for (String id : userIds) {
            usuarioRepository.findById(id).ifPresent(u -> {
                u.setIdDepartamento(idDestino);
                usuarioRepository.save(u);
            });
        }
    }

    public byte[] exportarMetricasExcel() {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Métricas de Gestión");
            
            // Header
            org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("Departamento");
            header.createCell(1).setCellValue("Trámites Activos");
            header.createCell(2).setCellValue("Tiempo Promedio (H)");
            header.createCell(3).setCellValue("Personal");

            List<MetricDataDTO> data = calcularMetricasDepartamentales();
            int rowIdx = 1;
            for (MetricDataDTO m : data) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(m.getNombreDepartamento());
                row.createCell(1).setCellValue(m.getCantidadTramites());
                row.createCell(2).setCellValue(m.getTiempoPromedioHoras());
                row.createCell(3).setCellValue(m.getCapacidadPersonal());
            }

            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (java.io.IOException e) {
            throw new RuntimeException("Error al generar Excel", e);
        }
    }

    public byte[] generarPDFAnalisis(String analysisText, String chartImageBase64, List<MetricDataDTO> customMetrics) {
        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.itextpdf.kernel.pdf.PdfWriter writer = new com.itextpdf.kernel.pdf.PdfWriter(out);
            com.itextpdf.kernel.pdf.PdfDocument pdf = new com.itextpdf.kernel.pdf.PdfDocument(writer);
            com.itextpdf.layout.Document document = new com.itextpdf.layout.Document(pdf);

            // Título
            document.add(new com.itextpdf.layout.element.Paragraph("INFORME ESTRATÉGICO DE OPTIMIZACIÓN BPM")
                .setBold().setFontSize(18).setTextAlignment(com.itextpdf.layout.properties.TextAlignment.CENTER));
            
            document.add(new com.itextpdf.layout.element.Paragraph("\nGenerado por el Motor de Inteligencia Artificial (Gemini)\n")
                .setItalic().setFontSize(10).setTextAlignment(com.itextpdf.layout.properties.TextAlignment.CENTER));

            // Tabla de Resumen Dinámica
            com.itextpdf.layout.element.Table table = new com.itextpdf.layout.element.Table(4);
            table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph("Departamento").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph("Carga").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph("Tiempo Prom.").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell().add(new com.itextpdf.layout.element.Paragraph("Personal").setBold()));

            List<MetricDataDTO> data = (customMetrics != null && !customMetrics.isEmpty()) 
                ? customMetrics 
                : calcularMetricasDepartamentales();

            for (MetricDataDTO m : data) {
                table.addCell(m.getNombreDepartamento());
                table.addCell(String.valueOf(m.getCantidadTramites()));
                table.addCell(String.format("%.2fh", m.getTiempoPromedioHoras()));
                table.addCell(String.valueOf(m.getCapacidadPersonal()));
            }
            document.add(table);

            // Análisis Narrativo
            document.add(new com.itextpdf.layout.element.Paragraph("\nANÁLISIS Y JUSTIFICACIÓN DE LA IA:\n").setBold());
            document.add(new com.itextpdf.layout.element.Paragraph(analysisText).setFontSize(11));

            // Agregar el gráfico generado si existe
            if (chartImageBase64 != null && !chartImageBase64.isEmpty()) {
                try {
                    String base64Data = chartImageBase64;
                    // Eliminar cabecera data:image/...;base64, si viene incluida
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.split(",")[1];
                    }
                    byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                    com.itextpdf.io.image.ImageData imageData = com.itextpdf.io.image.ImageDataFactory.create(imageBytes);
                    com.itextpdf.layout.element.Image pdfImage = new com.itextpdf.layout.element.Image(imageData);
                    pdfImage.setAutoScale(true); // Ajustar el tamaño a la página
                    document.add(new com.itextpdf.layout.element.Paragraph("\nGráfico de Tendencia de Carga:\n").setBold());
                    document.add(pdfImage);
                } catch (Exception e) {
                    System.err.println("No se pudo insertar el gráfico en el PDF: " + e.getMessage());
                }
            }

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF", e);
        }
    }

    @lombok.Data
    @lombok.Builder
    public static class MetricDataDTO {
        private String departamentoId;
        private String nombreDepartamento;
        private double tiempoPromedioHoras;
        private int cantidadTramites;
        private int capacidadPersonal;
        private int retrasosSla;
        private List<TrendPointDTO> trend;
    }

    public List<com.bpm.data.entities.PoliticaWorkflow> obtenerTodasLasPoliticas() {
        return politicaRepository.findAll();
    }

    @lombok.Data
    @lombok.Builder
    public static class TrendPointDTO {
        private String label; // Mes o Semana
        private int valor;
    }
}
