package com.bpm.domain.services;

import com.bpm.data.entities.ArchivoAdjunto;
import com.bpm.data.entities.TramiteInstancia;
import com.bpm.data.entities.Usuario;
import com.bpm.data.entities.Rol;
import com.bpm.data.repositories.UsuarioRepository;
import com.bpm.data.repositories.RolRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DocumentPermissionService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private RolRepository rolRepository;

    public boolean verificarPermiso(ArchivoAdjunto archivo, String usuarioId, String nivelRequerido) {
        // ADMIN / GERENTE_GENERAL tienen ADMIN sobre todo
        Usuario usuario = usuarioRepository.findById(usuarioId).orElse(null);
        if (usuario != null && usuario.getIdRol() != null) {
            Rol rol = rolRepository.findById(usuario.getIdRol()).orElse(null);
            if (rol != null) {
                String roleName = rol.getNombre();
                if ("ADMINISTRADOR".equals(roleName) || "GERENTE_GENERAL".equals(roleName)) {
                    return true;
                }
            }
        }

        if (archivo.getPermisos() == null || archivo.getPermisos().isEmpty()) {
            return false;
        }

        int requiredWeight = getWeight(nivelRequerido);

        for (ArchivoAdjunto.DocumentPermission perm : archivo.getPermisos()) {
            if (matchesSubject(perm, usuario) && getWeight(perm.getNivel()) >= requiredWeight) {
                return true;
            }
        }

        return false;
    }

    private boolean matchesSubject(ArchivoAdjunto.DocumentPermission perm, Usuario usuario) {
        if (usuario == null)
            return false;

        switch (perm.getTipoSujeto()) {
            case "USER":
                return usuario.getId().equals(perm.getSujetoId());
            case "ROLE":
                if (usuario.getIdRol() == null) return false;
                Rol rol = rolRepository.findById(usuario.getIdRol()).orElse(null);
                return rol != null && rol.getNombre().equals(perm.getSujetoId());
            case "DEPARTMENT":
                return usuario.getIdDepartamento() != null &&
                        usuario.getIdDepartamento().equals(perm.getSujetoId());
            default:
                return false;
        }
    }

    private int getWeight(String nivel) {
        switch (nivel) {
            case "ADMIN":
                return 3;
            case "WRITE":
                return 2;
            case "READ":
                return 1;
            default:
                return 0;
        }
    }

    public void asignarPermisosPorDefecto(ArchivoAdjunto archivo, TramiteInstancia tramite,
            String departamentoActualId) {
        List<ArchivoAdjunto.DocumentPermission> permisos = new ArrayList<>();

        if ("CONTRATO".equals(archivo.getTipoDocumento())) {
            permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                    .sujetoId("LEGAL_DEPT_ID") // Requires mapping to actual Legal dept ID
                    .tipoSujeto("DEPARTMENT")
                    .nivel("WRITE")
                    .build());
            permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                    .sujetoId("ADMINISTRADOR")
                    .tipoSujeto("ROLE")
                    .nivel("ADMIN")
                    .build());
            permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                    .sujetoId("GERENTE_GENERAL")
                    .tipoSujeto("ROLE")
                    .nivel("ADMIN")
                    .build());
        } else {
            // General documents: Uploader gets ADMIN, Department gets WRITE, Requester gets
            // READ
            if (archivo.getIdUsuarioSubida() != null) {
                permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                        .sujetoId(archivo.getIdUsuarioSubida())
                        .tipoSujeto("USER")
                        .nivel("ADMIN")
                        .build());
            }
            if (departamentoActualId != null) {
                permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                        .sujetoId(departamentoActualId)
                        .tipoSujeto("DEPARTMENT")
                        .nivel("WRITE")
                        .build());
            }
            if (archivo.getIdCliente() != null) {
                permisos.add(ArchivoAdjunto.DocumentPermission.builder()
                        .sujetoId(archivo.getIdCliente())
                        .tipoSujeto("USER")
                        .nivel("READ")
                        .build());
            }
        }
        archivo.setPermisos(permisos);
    }
}
