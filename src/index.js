import {
  useEffect,
  useCallback,
  useState,
  useRef,
  useContext,
  createContext,
  createElement
} from "react";
import PropTypes from "prop-types";
import { shallowEqualObjects } from "shallow-equal";

const context = createContext();

/**
 * Create a Form store to handle all form logic outside react flow and return methods
 *
 * @param {Object.<string, any>} initialValues Initial form values
 * @param {import("yup").Schema} initialSchema Yup schema
 *
 * @return {{ set: {(values: Object.<string, any>) => void},
 *            setField: {(field: string, value: any, shouldValidate: bool) => Promise<void>},
 *            setFieldMeta: {(field: string, property: string, value: any) => void},
 *            setErrors: {(errors: Object.<string, any>) => void},
 *            on: {(name: string, callback: (data : any) => void) => void},
 *            setSchema: {(schema: import("yup").Schema) => void},
 *            validate: {() => Promise<void>},
 *            get: {() => Object.<string, any>},
 *            getErrors: {() => Object.<string, string>},
 *            getProperties: {() => Object.<string, Object.<string, any>>}
 *         }}
 */
export const createFormStore = (initialValues = {}, initialSchema) => {
  let values = initialValues;
  const properties = {};
  let errors = {};
  const handlers = {};
  let schema = initialSchema;

  const on = (name, cb) => {
    (handlers[name] || (handlers[name] = [])).push(cb);

    return () => {
      handlers[name] = handlers[name].filter(i => i !== cb);
    };
  };

  const emit = (name, data) => {
    (handlers[name] || []).forEach(cb => cb(data));
  };

  const setFieldMeta = (field, property, nextValue) => {
    const value = properties[field] && properties[field][property];
    if (!shallowEqualObjects(value, nextValue)) {
      properties[field] = { ...properties[field], [property]: nextValue };
      emit("properties", { [field]: properties[field] });
    }
  };

  const setErrors = nextErrors => {
    if (!shallowEqualObjects(errors, nextErrors)) {
      errors = nextErrors;
      emit("errors", nextErrors);
    }
  };

  const validate = async () => {
    if (schema && schema.validate) {
      try {
        await schema.validate(values, { abortEarly: false });
        if (errors && Object.keys(errors).length) setErrors({});
        return {};
      } catch (result) {
        const nextErrors = (result.inner || []).reduce(
          (yupErrors, yupError) => ({
            ...yupErrors,
            [yupError.path]: yupError.message
          }),
          {}
        );
        if (!shallowEqualObjects(errors, nextErrors)) setErrors(nextErrors);
        return nextErrors;
      }
    }
  };

  const setSchema = nextSchema => {
    schema = nextSchema;
    validate();
  };

  const setField = async (field, value, shouldValidate = true) => {
    if (values[field] !== value) {
      values[field] = value;
      emit("values", { [field]: value });
      if (shouldValidate) await validate();
      if (typeof shouldValidate === "function")
        shouldValidate({
          value,
          error: errors[field],
          meta: properties[field]
        });
      return { value, error: errors[field], meta: properties[field] };
    }
  };

  const set = nextValues => {
    values = {
      ...values,
      ...nextValues
    };
    emit("values", nextValues);
  };

  const get = () => ({ ...values });

  const getErrors = () => ({ ...errors });

  const getProperties = () => ({ ...properties });

  return {
    set,
    setField,
    setFieldMeta,
    setErrors,
    on,
    setSchema,
    validate,
    get,
    getErrors,
    getProperties
  };
};

/**
 * Custom hook to retrieve and set form level data
 *
 * @returns {{ setSchema: {(schema: any) => void},
 *             get: {() => Object.<string, any>},
 *             set: {(fields: Object.<string, any>) => void},
 *             isValid: boolean
 *          }}
 *
 */
export const useForm = () => {
  const { setSchema, get, set, getErrors, validate, on } = useContext(context);
  const [isValid, setValid] = useState(() => !Object.keys(getErrors()).length);

  useEffect(() => {
    validate();
    return on("errors", () => {
      setValid(Object.keys(getErrors()).length === 0);
    });
  }, [getErrors, on, validate]);

  return {
    get,
    set,
    setSchema,
    isValid
  };
};

/**
 * Custom hook to retrieve and set form field level data
 *
 * @param {string} field field name
 * @param {bool} [controlled=true] set to false to not re-render for value change
 *
 * @returns {{ value: any,
 *             getValue: {() => any},
 *             ref: any,
 *             meta: any,
 *             error: string,
 *             set: {(value: any) => void},
 *             setMeta: {(property: string, value: any) => void}
 *          }}
 *
 */
export const useFormField = (field, controlled = false) => {
  const {
    setField,
    setFieldMeta,
    get,
    getProperties,
    getErrors,
    on
  } = useContext(context);
  const value = useRef(get()[field]);
  const meta = useRef(getProperties()[field] || {});
  const error = useRef(getErrors()[field]);
  const [, rerender] = useState({});

  useEffect(() => {
    value.current = get()[field];
    meta.current = getProperties()[field] || {};
    error.current = getErrors()[field];
    rerender({});
  }, [controlled, get, getProperties, getErrors, field]);

  useEffect(() => {
    const handlers = [
      on("values", values => {
        if (values.hasOwnProperty(field) && value.current !== values[field]) {
          value.current = values[field];
          if (controlled) rerender({});
        }
      }),
      on("properties", properties => {
        if (
          properties.hasOwnProperty(field) &&
          meta.current !== properties[field]
        ) {
          meta.current = properties[field] || {};
          rerender({});
        }
      }),
      on("errors", errors => {
        if (error.current !== errors[field]) {
          error.current = errors[field];
          rerender({});
        }
      })
    ];

    return () => {
      handlers.forEach(removeHandler => removeHandler());
    };
  }, [on, field, controlled, setField, rerender]);

  return {
    value: value.current || "",
    ref: value,
    meta: meta.current,
    error: error.current,
    set: useCallback(val => setField(field, val), [field, setField]),
    setMeta: useCallback((prop, val) => setFieldMeta(field, prop, val), [
      field,
      setFieldMeta
    ])
  };
};

/**
 * Acts as a context provider for any subsequent useForm and useFormField hooks
 *
 * @param {Object.<string, any>} initialValues Object containing initial form values
 * @param {Object.<string, any>} schema yup compatible schema object
 *
 */
export const FormProvider = ({ children, initialValues, schema }) =>
  createElement(
    context.Provider,
    {
      value: createFormStore(initialValues, schema)
    },
    children
  );

FormProvider.propTypes = {
  initialValues: PropTypes.object,
  schema: PropTypes.object,
  children: PropTypes.element.isRequired
};

FormProvider.defaultProps = {
  initialValues: {},
  schema: undefined
};
