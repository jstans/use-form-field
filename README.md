# use-form-field

An unopionated react form context library using hooks and the context API.

## Install

```js
npm install use-form-field
```

## Documentation

### useFormField

```jsx
useFormField(name, (controlled = false));
```

#### Options

`name` - _string_ name to use for the form field.

`controlled` - _boolean_ _optional_ Whether field is going to be controlled or not. Ultimately this will assume you are using
the ref as opposed to the value and not trigger a re-render on value changes.

#### Example

```jsx
import { useFormField } from "use-form-field";

const UncontrolledInput = ({ name }) => {
  const { set, ref, error } = useFormField(name);

  const handleChange = e => {
    set(e.target.value, true);
  };

  return (
    <React.Fragment>
      <input name={name} type="text" onChange={handleChange} ref={ref} />
      {error}
    </React.Fragment>
  );
};
```

### useForm

```jsx
useForm({ withValues = false, onChange });
```

#### Options

`withValues` - _boolean_ _optional_ Whether to return complete values object. _This will cause re-renders on change_

`onChange` - _function_ _optional_ Function containing object of changed values.

#### Example

```jsx
import { useForm } from "use-form-field";

const Form = () => {
  const { get, isValid } = useForm();
  const [values, setValues] = useState(undefined);

  const handleSubmit = e => {
    e.preventDefault();
    setValues(get());
  };

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <UncontrolledInput name="field" />
        <br />
        <button type="submit" disabled={!isValid}>
          Submit
        </button>
      </form>
      {values && JSON.stringify(values)}
    </React.Fragment>
  );
};
```

### FormProvider

```jsx
<FormProvider />
```

#### Options

`values` - _object_ _optional_ An object containing values to set field values to.

`schema` - _object_ _optional_ A yup compatible schema for automatic validation

`children` - Children can be React elements or a function, if using a function you will receive the return value from useForm() and you may pass additional props to FormProvider that will be used as arguments for useForm().

#### Example (JSX)

```jsx
import { FormProvider } from "use-form-field";

const App = () => (
  <FormProvider>
    <Form />
  </FormProvider>
);
```

#### Example (Function)

```jsx
import { FormProvider } from "use-form-field";

const App = () => (
  <FormProvider withValues>
    {({ values, isValid }) => (
      <React.Fragment>
        <Form />
        {[JSON.stringify(values), " ", isValid ? "valid" : "invalid"]}
      </React.Fragment>
    )}
  </FormProvider>
);
```

### Full example with dynamic fields

```jsx
import { FormProvider, useForm, useFormField } from "use-form-field";
import { object, string } from "yup";

const initialValues = {
  field1: "field 1",
  field2: "field 2"
};
const validationSchema = object().shape({
  field1: string().max(20),
  field2: string().max(20)
});

const ControlledInput = ({ name }) => {
  const { set, value, error } = useFormField(name, true);

  const handleChange = e => {
    set(e.target.value, true);
  };

  return (
    <React.Fragment>
      <input name={name} type="text" onChange={handleChange} value={value} />
      {error}
    </React.Fragment>
  );
};

const UncontrolledInput = ({ name }) => {
  const { set, ref, error } = useFormField(name);

  const handleChange = e => {
    set(e.target.value, true);
  };

  return (
    <React.Fragment>
      <input name={name} type="text" onChange={handleChange} ref={ref} />
      {error}
    </React.Fragment>
  );
};

const Form = () => {
  const { get, isValid } = useForm();
  const [values, setValues] = useState(undefined);
  const [fields, setFields] = useState(["field1", "field2"]);

  const handleSubmit = e => {
    e.preventDefault();
    setValues(get());
  };

  const handleFlip = () => {
    setFields([...fields.reverse()]);
  };

  return (
    <React.Fragment>
      <form onSubmit={handleSubmit}>
        <ControlledInput name={fields[0]} />
        <br />
        <UncontrolledInput name={fields[1]} />
        <br />
        <button type="button" onClick={handleFlip}>
          Flip
        </button>
        <button type="submit" disabled={!isValid}>
          Submit
        </button>
      </form>
      {values && JSON.stringify(values)}
    </React.Fragment>
  );
};

const App = () => (
  <FormProvider values={initialValues} schema={validationSchema}>
    <Form />
  </FormProvider>
);
```
