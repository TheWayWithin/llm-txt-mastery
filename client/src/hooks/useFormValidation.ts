/**
 * Generic form validation hook with Zod
 *
 * Provides comprehensive form state management with field-level validation,
 * error handling, and submission state tracking.
 */

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import {
  ValidationError,
  FormFieldError,
  ValidationResult,
  validateForm,
} from '@/lib/validation-utils';
import { AppError } from '@/lib/error-utils';

export interface UseFormValidationOptions<T> {
  /** Initial form values */
  initialValues?: Partial<T>;
  /** Validation schema — an object schema, so per-field validation can .pick() */
  schema: z.ZodObject<z.ZodRawShape, z.UnknownKeysParam, z.ZodTypeAny, T>;
  /** Validate on change */
  validateOnChange?: boolean;
  /** Validate on blur */
  validateOnBlur?: boolean;
  /** Submit handler */
  onSubmit?: (data: T) => Promise<void> | void;
  /** Success callback */
  onSuccess?: (data: T) => void;
  /** Error callback */
  onError?: (error: AppError | ValidationError) => void;
  /** Reset form after successful submission */
  resetOnSuccess?: boolean;
}

export interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormState<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitError: string | null;
}

export interface UseFormValidationReturn<T> {
  /** Current form state */
  state: FormState<T>;
  /** Form values */
  values: Partial<T>;
  /** Form errors */
  errors: Record<string, string>;
  /** Field touched state */
  touched: Record<string, boolean>;
  /** Field dirty state */
  dirty: Record<string, boolean>;
  /** Overall form validity */
  isValid: boolean;
  /** Submission state */
  isSubmitting: boolean;
  /** Has been submitted */
  isSubmitted: boolean;
  /** Submit error */
  submitError: string | null;

  /** Get field state */
  getFieldState: (name: keyof T) => FieldState;
  /** Get field props for input components */
  getFieldProps: (name: keyof T) => {
    value: any;
    onChange: (value: any) => void;
    onBlur: () => void;
    error: string | null;
  };

  /** Set field value */
  setValue: (name: keyof T, value: any) => void;
  /** Set multiple values */
  setValues: (values: Partial<T>) => void;
  /** Set field error */
  setFieldError: (name: keyof T, error: string | null) => void;
  /** Set multiple errors */
  setErrors: (errors: Record<string, string>) => void;
  /** Clear field error */
  clearFieldError: (name: keyof T) => void;
  /** Clear all errors */
  clearErrors: () => void;

  /** Mark field as touched */
  setFieldTouched: (name: keyof T, touched?: boolean) => void;
  /** Validate single field */
  validateField: (name: keyof T) => ValidationResult;
  /** Validate entire form */
  validateForm: () => ValidationResult;

  /** Submit form */
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Reset form */
  reset: (values?: Partial<T>) => void;
  /** Check if form has changes */
  isDirty: () => boolean;
  /** Check if field has error */
  hasFieldError: (name: keyof T) => boolean;
  /** Get first error message */
  getFirstError: () => string | null;
}

/**
 * Comprehensive form validation hook
 */
export function useFormValidation<T extends Record<string, any>>(
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const {
    initialValues = {} as Partial<T>,
    schema,
    validateOnChange = false,
    validateOnBlur = true,
    onSubmit,
    onSuccess,
    onError,
    resetOnSuccess = false,
  } = options;

  // Form state
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    dirty: {},
    isValid: false,
    isSubmitting: false,
    isSubmitted: false,
    submitError: null,
  });

  // Validate a single field
  const validateField = useCallback(
    (name: keyof T): ValidationResult => {
      const value = state.values[name];

      try {
        // Create a temporary schema for this field
        const fieldSchema = schema.pick({ [name]: true } as any);
        const result = validateForm(fieldSchema, { [name]: value });

        if (result.errors?.length) {
          return {
            isValid: false,
            errors: result.errors,
            firstError: result.errors[0],
          };
        }

        return {
          isValid: true,
          errors: [],
        };
      } catch (error) {
        return {
          isValid: false,
          errors: [{ field: String(name), message: 'Validation failed' }],
          firstError: { field: String(name), message: 'Validation failed' },
        };
      }
    },
    [schema, state.values]
  );

  // Validate entire form
  const validateFormFn = useCallback((): ValidationResult => {
    const result = validateForm(schema, state.values);

    if (result.errors?.length) {
      return {
        isValid: false,
        errors: result.errors,
        firstError: result.errors[0],
      };
    }

    return {
      isValid: true,
      errors: [],
    };
  }, [schema, state.values]);

  // Update form validity when values or errors change
  const isValid = useMemo(() => {
    const hasErrors = Object.keys(state.errors).some((key) => state.errors[key]);
    if (hasErrors) return false;

    const validation = validateFormFn();
    return validation.isValid;
  }, [state.errors, validateFormFn]);

  // Set field value
  const setValue = useCallback(
    (name: keyof T, value: any) => {
      setState((prev) => {
        const newState = {
          ...prev,
          values: { ...prev.values, [name]: value },
          dirty: { ...prev.dirty, [name]: true },
        };

        // Validate on change if enabled
        if (validateOnChange) {
          const validation = validateField(name);
          if (!validation.isValid && validation.firstError) {
            newState.errors = { ...prev.errors, [String(name)]: validation.firstError.message };
          } else {
            const newErrors = { ...prev.errors };
            delete newErrors[String(name)];
            newState.errors = newErrors;
          }
        }

        return newState;
      });
    },
    [validateOnChange, validateField]
  );

  // Set multiple values
  const setValues = useCallback((values: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      values: { ...prev.values, ...values },
      dirty: Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), prev.dirty),
    }));
  }, []);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: error
        ? { ...prev.errors, [String(name)]: error }
        : (() => {
            const newErrors = { ...prev.errors };
            delete newErrors[String(name)];
            return newErrors;
          })(),
    }));
  }, []);

  // Set multiple errors
  const setErrors = useCallback((errors: Record<string, string>) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, ...errors },
    }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((name: keyof T) => {
    setState((prev) => {
      const newErrors = { ...prev.errors };
      delete newErrors[String(name)];
      return { ...prev, errors: newErrors };
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      errors: {},
      submitError: null,
    }));
  }, []);

  // Set field touched
  const setFieldTouched = useCallback(
    (name: keyof T, touched = true) => {
      setState((prev) => ({
        ...prev,
        touched: { ...prev.touched, [String(name)]: touched },
      }));

      // Validate on blur if enabled and field is being touched
      if (validateOnBlur && touched) {
        const validation = validateField(name);
        if (!validation.isValid && validation.firstError) {
          setFieldError(name, validation.firstError.message);
        } else {
          clearFieldError(name);
        }
      }
    },
    [validateOnBlur, validateField, setFieldError, clearFieldError]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
        submitError: null,
      }));

      try {
        // Validate entire form
        const validation = validateFormFn();

        if (!validation.isValid) {
          const errorMap: Record<string, string> = {};
          validation.errors.forEach((error) => {
            errorMap[error.field] = error.message;
          });

          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, ...errorMap },
            isSubmitting: false,
            isSubmitted: true,
          }));

          const validationError = new ValidationError(validation.errors);
          onError?.(validationError);
          return;
        }

        // Submit form. validateFormFn returns pass/fail only (no parsed data),
        // so submission has always used the live form values.
        if (onSubmit) {
          await onSubmit(state.values as T);
        }

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          isSubmitted: true,
        }));

        onSuccess?.(state.values as T);

        // Reset form if requested
        if (resetOnSuccess) {
          reset();
        }
      } catch (error) {
        const appError = AppError.fromError(error);

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          isSubmitted: true,
          submitError: appError.message,
        }));

        onError?.(appError);
      }
    },
    [validateFormFn, onSubmit, onSuccess, onError, resetOnSuccess, state.values]
  );

  // Reset form
  const reset = useCallback(
    (newValues?: Partial<T>) => {
      setState({
        values: newValues || initialValues,
        errors: {},
        touched: {},
        dirty: {},
        isValid: false,
        isSubmitting: false,
        isSubmitted: false,
        submitError: null,
      });
    },
    [initialValues]
  );

  // Check if form is dirty
  const isDirty = useCallback(() => {
    return Object.values(state.dirty).some(Boolean);
  }, [state.dirty]);

  // Check if field has error
  const hasFieldError = useCallback(
    (name: keyof T) => {
      return Boolean(state.errors[String(name)]);
    },
    [state.errors]
  );

  // Get first error
  const getFirstError = useCallback(() => {
    const errorKeys = Object.keys(state.errors);
    return errorKeys.length > 0 ? state.errors[errorKeys[0]] : null;
  }, [state.errors]);

  // Get field state
  const getFieldState = useCallback(
    (name: keyof T): FieldState => ({
      value: state.values[name],
      error: state.errors[String(name)] || null,
      touched: state.touched[String(name)] || false,
      dirty: state.dirty[String(name)] || false,
    }),
    [state]
  );

  // Get field props for easy integration with input components
  const getFieldProps = useCallback(
    (name: keyof T) => ({
      value: state.values[name] || '',
      onChange: (value: any) => setValue(name, value),
      onBlur: () => setFieldTouched(name, true),
      error: state.errors[String(name)] || null,
    }),
    [state, setValue, setFieldTouched]
  );

  return {
    state: {
      ...state,
      isValid,
    },
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    dirty: state.dirty,
    isValid,
    isSubmitting: state.isSubmitting,
    isSubmitted: state.isSubmitted,
    submitError: state.submitError,

    getFieldState,
    getFieldProps,
    setValue,
    setValues,
    setFieldError,
    setErrors,
    clearFieldError,
    clearErrors,
    setFieldTouched,
    validateField,
    validateForm: validateFormFn,
    handleSubmit,
    reset,
    isDirty,
    hasFieldError,
    getFirstError,
  };
}

/**
 * Simplified form validation hook for basic use cases
 */
export function useSimpleForm<T extends Record<string, any>>(
  schema: z.ZodObject<z.ZodRawShape, z.UnknownKeysParam, z.ZodTypeAny, T>,
  onSubmit: (data: T) => Promise<void> | void,
  initialValues?: Partial<T>
) {
  return useFormValidation({
    schema,
    onSubmit,
    initialValues,
    validateOnBlur: true,
    resetOnSuccess: false,
  });
}
