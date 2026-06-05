package com.bpm.domain.services;

import com.bpm.data.entities.Usuario;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import com.bpm.data.repositories.EventoHistorialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.io.ByteArrayOutputStream;
import org.apache.poi.xwpf.usermodel.*;

@Service
@RequiredArgsConstructor
public class AnaliticaService {

    private final TramiteInstanciaRepository tramiteRepository;
    private final DepartamentoRepository departamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EventoHistorialRepository historialRepository;
    private final com.bpm.data.repositories.PoliticaWorkflowRepository politicaRepository;
    private final MongoTemplate mongoTemplate;

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
                            .filter(t -> t.getDepartamentoActualId() != null
                                    && t.getDepartamentoActualId().equals(dept.getId()))
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

            document.add(
                    new com.itextpdf.layout.element.Paragraph("\nGenerado por el Modelo de Inteligencia Artificial \n")
                            .setItalic().setFontSize(10)
                            .setTextAlignment(com.itextpdf.layout.properties.TextAlignment.CENTER));

            // Tabla de Resumen Dinámica
            com.itextpdf.layout.element.Table table = new com.itextpdf.layout.element.Table(4);
            table.addCell(new com.itextpdf.layout.element.Cell()
                    .add(new com.itextpdf.layout.element.Paragraph("Departamento").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell()
                    .add(new com.itextpdf.layout.element.Paragraph("Carga").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell()
                    .add(new com.itextpdf.layout.element.Paragraph("Tiempo Prom.").setBold()));
            table.addCell(new com.itextpdf.layout.element.Cell()
                    .add(new com.itextpdf.layout.element.Paragraph("Personal").setBold()));

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
            String cleanText = analysisText != null ? analysisText : "Sin análisis disponible.";
            // Limpiar posibles artefactos markdown del texto de la IA
            cleanText = cleanText.replaceAll("\\*\\*", "").replaceAll("##\\s*", "").replaceAll("#\\s*", "");
            document.add(new com.itextpdf.layout.element.Paragraph(cleanText).setFontSize(11));

            // Agregar el gráfico generado si existe
            if (chartImageBase64 != null && !chartImageBase64.isEmpty()) {
                try {
                    String base64Data = chartImageBase64;
                    // Eliminar cabecera data:image/...;base64, si viene incluida
                    if (base64Data.contains(",")) {
                        base64Data = base64Data.split(",")[1];
                    }
                    byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
                    com.itextpdf.io.image.ImageData imageData = com.itextpdf.io.image.ImageDataFactory
                            .create(imageBytes);
                    com.itextpdf.layout.element.Image pdfImage = new com.itextpdf.layout.element.Image(imageData);
                    pdfImage.setAutoScale(true); // Ajustar el tamaño a la página
                    document.add(
                            new com.itextpdf.layout.element.Paragraph("\nGráfico de Tendencia de Carga:\n").setBold());
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

    public byte[] generarReporteWord(String analysisText, List<MetricDataDTO> customMetrics) {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            XWPFRun titleRun = title.createRun();
            titleRun.setText("INFORME ESTRATÉGICO DE GESTIÓN BPM");
            titleRun.setBold(true);
            titleRun.setFontSize(18);

            List<MetricDataDTO> data = (customMetrics != null && !customMetrics.isEmpty())
                    ? customMetrics : calcularMetricasDepartamentales();

            XWPFTable table = doc.createTable(data.size() + 1, 4);
            XWPFTableRow headerRow = table.getRow(0);
            headerRow.getCell(0).setText("Departamento");
            headerRow.getCell(1).setText("Trámites");
            headerRow.getCell(2).setText("Tiempo Prom. (h)");
            headerRow.getCell(3).setText("Capacidad");

            for (int i = 0; i < data.size(); i++) {
                MetricDataDTO m = data.get(i);
                XWPFTableRow row = table.getRow(i + 1);
                row.getCell(0).setText(m.getNombreDepartamento());
                row.getCell(1).setText(String.valueOf(m.getCantidadTramites()));
                row.getCell(2).setText(String.format("%.2f", m.getTiempoPromedioHoras()));
                row.getCell(3).setText(String.valueOf(m.getCapacidadPersonal()));
            }

            XWPFParagraph analysisHeader = doc.createParagraph();
            XWPFRun analysisHeaderRun = analysisHeader.createRun();
            analysisHeaderRun.setText("\nANÁLISIS Y JUSTIFICACIÓN DE LA IA:\n");
            analysisHeaderRun.setBold(true);

            XWPFParagraph analysisBody = doc.createParagraph();
            XWPFRun analysisBodyRun = analysisBody.createRun();
            String cleanText = analysisText != null ? analysisText : "Sin análisis disponible.";
            cleanText = cleanText.replaceAll("\\*\\*", "").replaceAll("##\\s*", "").replaceAll("#\\s*", "");
            analysisBodyRun.setText(cleanText);

            doc.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar Word", e);
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

    public NlpReportResult ejecutarReporteDinamicoNLP(NlpReportParams params) {
        String dimension = params.getDimension() != null ? params.getDimension().toLowerCase() : "status";
        String metric = params.getMetric() != null ? params.getMetric().toLowerCase() : "count";
        Map<String, Object> filters = params.getFilters() != null ? params.getFilters() : new HashMap<>();

        Query query = new Query();

        // Aplicar filtros seguros sin inyección
        if (filters.get("status") != null && filters.get("status") != null && !filters.get("status").toString().equalsIgnoreCase("null")) {
            query.addCriteria(Criteria.where("estadoActual").is(filters.get("status").toString().toUpperCase()));
        }
        if (filters.get("priority") != null && !filters.get("priority").toString().equalsIgnoreCase("null")) {
            try {
                int priorityVal = Integer.parseInt(filters.get("priority").toString());
                query.addCriteria(Criteria.where("prioridad").is(priorityVal));
            } catch (NumberFormatException e) {
                String priorityStr = filters.get("priority").toString().toUpperCase();
                int priorityVal = 3;
                if (priorityStr.contains("HIGH") || priorityStr.contains("ALTA") || priorityStr.contains("CRITIC")) priorityVal = 4;
                else if (priorityStr.contains("LOW") || priorityStr.contains("BAJA")) priorityVal = 1;
                query.addCriteria(Criteria.where("prioridad").is(priorityVal));
            }
        }
        if (filters.get("department") != null && !filters.get("department").toString().equalsIgnoreCase("null")) {
            String deptFilter = filters.get("department").toString();
            List<String> deptIds = departamentoRepository.findAll().stream()
                .filter(d -> d.getNombre().equalsIgnoreCase(deptFilter) || d.getId().equalsIgnoreCase(deptFilter))
                .map(d -> d.getId())
                .collect(Collectors.toList());
            if (!deptIds.isEmpty()) {
                query.addCriteria(Criteria.where("departamentoActualId").in(deptIds));
            }
        }
        if (filters.get("days") != null && !filters.get("days").toString().equalsIgnoreCase("null")) {
            try {
                int days = Integer.parseInt(filters.get("days").toString());
                query.addCriteria(Criteria.where("createdAt").gte(LocalDateTime.now().minusDays(days)));
            } catch (NumberFormatException ignored) {}
        }

        List<TramiteInstancia> tramites = mongoTemplate.find(query, TramiteInstancia.class);

        Map<String, List<TramiteInstancia>> agrupados;
        
        switch (dimension) {
            case "department":
                Map<String, String> deptoNombres = departamentoRepository.findAll().stream()
                    .collect(Collectors.toMap(d -> d.getId(), d -> d.getNombre(), (v1, v2) -> v1));
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> {
                        String id = t.getDepartamentoActualId();
                        return id != null ? deptoNombres.getOrDefault(id, "Sin Departamento") : "Sin Asignar";
                    }));
                break;
            case "priority":
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> {
                        int pri = t.getPrioridad() != null ? t.getPrioridad() : 3;
                        switch (pri) {
                            case 1: case 2: return "Prioridad Baja";
                            case 3: return "Prioridad Media";
                            case 4: case 5: return "Prioridad Alta/Crítica";
                            default: return "Prioridad Media";
                        }
                    }));
                break;
            case "month":
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> {
                        if (t.getCreatedAt() == null) return "Desconocido";
                        return String.format("%d-%02d", t.getCreatedAt().getYear(), t.getCreatedAt().getMonthValue());
                    }));
                break;
            case "policy":
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> {
                        if (t.getIdPolitica() == null) return "Sin Política";
                        return politicaRepository.findById(t.getIdPolitica())
                            .map(p -> p.getNombre()).orElse("Desconocida");
                    }));
                break;
            case "client":
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> 
                        t.getNombreSolicitante() != null ? t.getNombreSolicitante() : "Sin Nombre"
                    ));
                break;
            case "status":
            default:
                agrupados = tramites.stream()
                    .collect(Collectors.groupingBy(t -> t.getEstadoActual() != null ? t.getEstadoActual() : "SIN_ESTADO"));
                break;
        }

        List<NlpReportPoint> reportPoints = new ArrayList<>();
        agrupados.forEach((key, list) -> {
            double val;
            if ("average_duration".equals(metric)) {
                val = list.stream()
                    .mapToLong(t -> {
                        LocalDateTime start = t.getCreatedAt() != null ? t.getCreatedAt() : LocalDateTime.now();
                        LocalDateTime end = "FINALIZADO".equalsIgnoreCase(t.getEstadoActual()) && t.getUpdatedAt() != null ? t.getUpdatedAt() : LocalDateTime.now();
                        return Duration.between(start, end).toHours();
                    })
                    .average()
                    .orElse(0.0);
            } else {
                val = list.size();
            }
            reportPoints.add(new NlpReportPoint(key, val));
        });

        reportPoints.sort(Comparator.comparing(NlpReportPoint::getLabel));

        return NlpReportResult.builder()
            .dimension(dimension)
            .metric(metric)
            .data(reportPoints)
            .build();
    }

    @lombok.Data
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    @lombok.Builder
    public static class NlpReportParams {
        private String dimension;
        private String metric;
        private Map<String, Object> filters;
    }

    @lombok.Data
    @lombok.Builder
    public static class NlpReportResult {
        private String dimension;
        private String metric;
        private List<NlpReportPoint> data;
    }

    @lombok.Data
    @lombok.Builder
    @lombok.AllArgsConstructor
    public static class NlpReportPoint {
        private String label;
        private double value;
    }

    @lombok.Data
    @lombok.Builder
    public static class TrendPointDTO {
        private String label; // Mes o Semana
        private int valor;
    }
}
