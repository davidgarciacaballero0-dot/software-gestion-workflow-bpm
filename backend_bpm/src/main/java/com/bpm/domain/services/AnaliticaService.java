package com.bpm.domain.services;

import com.bpm.data.entities.Usuario;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.DepartamentoRepository;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
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
                    .build();
        }).collect(Collectors.toList());
    }

    public void reasignarPersonal(String idOrigen, String idDestino, int cantidad) {
        List<Usuario> personalOrigen = usuarioRepository.findByIdDepartamento(idOrigen);
        int aMover = Math.min(cantidad, personalOrigen.size());

        for (int i = 0; i < aMover; i++) {
            Usuario u = personalOrigen.get(i);
            u.setIdDepartamento(idDestino);
            usuarioRepository.save(u);
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

    public byte[] generarPDFAnalisis(String analysisText) {
        try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
            com.itextpdf.kernel.pdf.PdfWriter writer = new com.itextpdf.kernel.pdf.PdfWriter(out);
            com.itextpdf.kernel.pdf.PdfDocument pdf = new com.itextpdf.kernel.pdf.PdfDocument(writer);
            com.itextpdf.layout.Document document = new com.itextpdf.layout.Document(pdf);

            // Título
            document.add(new com.itextpdf.layout.element.Paragraph("INFORME ESTRATÉGICO DE OPTIMIZACIÓN BPM")
                .setBold().setFontSize(18).setTextAlignment(com.itextpdf.layout.properties.TextAlignment.CENTER));
            
            document.add(new com.itextpdf.layout.element.Paragraph("\nGenerado por el Motor de Inteligencia Artificial (Gemini)\n")
                .setItalic().setFontSize(10).setTextAlignment(com.itextpdf.layout.properties.TextAlignment.CENTER));

            // Tabla de Resumen
            com.itextpdf.layout.element.Table table = new com.itextpdf.layout.element.Table(4);
            table.addCell("Departamento");
            table.addCell("Carga");
            table.addCell("Tiempo Prom.");
            table.addCell("Personal");

            for (MetricDataDTO m : calcularMetricasDepartamentales()) {
                table.addCell(m.getNombreDepartamento());
                table.addCell(String.valueOf(m.getCantidadTramites()));
                table.addCell(m.getTiempoPromedioHoras() + "h");
                table.addCell(String.valueOf(m.getCapacidadPersonal()));
            }
            document.add(table);

            // Análisis Narrativo
            document.add(new com.itextpdf.layout.element.Paragraph("\nANÁLISIS Y JUSTIFICACIÓN DE LA IA:\n").setBold());
            document.add(new com.itextpdf.layout.element.Paragraph(analysisText).setFontSize(11));

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
    }
}
