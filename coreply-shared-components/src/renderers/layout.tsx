import { rankWith, uiTypeIs } from '@jsonforms/core';
import { ResolvedJsonFormsDispatch } from '@jsonforms/react';
import { View } from 'react-native';

const ViewLayout = (props: any) => {
  return (
    <View>
      {props.uischema.elements.map((child: any, index: number) => (
        <ResolvedJsonFormsDispatch
          schema={props.schema}
          uischema={child}
          path={props.path}
          enabled={props.enabled}
          renderers={props.renderers}
          cells={props.cells}
          key={index}
        />
      ))}
    </View>
  );
};

export const viewTester = rankWith(12, uiTypeIs('VerticalLayout'));

export const LayoutRenderer = ViewLayout;

export const renderers = [
  { tester: viewTester, renderer: LayoutRenderer },
];
