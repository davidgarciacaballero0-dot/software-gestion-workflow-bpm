package com.bpm.app.exceptions;

public class WorkflowValidationException extends RuntimeException {
    public WorkflowValidationException(String message) {
        super(message);
    }
}
