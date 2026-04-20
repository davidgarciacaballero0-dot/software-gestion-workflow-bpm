
package com.bpm.app.config;

import com.bpm.data.entities.PoliticaWorkflow;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.repositories.PoliticaWorkflowRepository;
import com.bpm.data.repositories.TramiteInstanciaRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DebugDataExplorer implements CommandLineRunner {

    private final PoliticaWorkflowRepository politicaRepository;
    private final TramiteInstanciaRepository tramiteRepository;

    public DebugDataExplorer(PoliticaWorkflowRepository politicaRepository, TramiteInstanciaRepository tramiteRepository) {
        this.politicaRepository = politicaRepository;
        this.tramiteRepository = tramiteRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== DEBUG DATA EXPLORER ===");
        List<PoliticaWorkflow> politicas = politicaRepository.findAll();
        System.out.println("Politicas found: " + politicas.size());
        for (PoliticaWorkflow p : politicas) {
            System.out.println("ID: " + p.getId() + " | Nombre: " + p.getNombre() + " | Nodes: " + (p.getNodes() != null ? p.getNodes().size() : "NULL"));
        }

        List<TramiteInstancia> tramites = tramiteRepository.findAll();
        System.out.println("Tramites found: " + tramites.size());
        for (TramiteInstancia t : tramites) {
            System.out.println("ID: " + t.getId() + " | Codigo: " + t.getCodigoTramite() + " | ID Politica Ref: " + t.getIdPolitica() + " | Nodo Actual: " + t.getNodoActualId());
        }
    }
}
