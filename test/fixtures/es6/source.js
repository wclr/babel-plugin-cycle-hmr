/* @cycle-hmr */
import {Observable} from 'rx'
import {Imported} from 'Imporeted'
import {isolate} from 'isolate'

const x = 1

const Component1 = ({DOM, HTTP: string}) => {
  
}

function Component2 ({DOM, HTTP: string}) {

}


/* ExportNamedDeclaration */
// ArrowFunctionExpression
export const NamedComponentArrow = ({DOM, HTTP: string}) => {
}

// FunctionExpression
export const NamedComponentFuncExp = function ({DOM, HTTP: string}){
}

// FunctionDeclaration
export function NameExportFunctionDeclaration ({DOM, HTTP: string}) {
}

export default function DefaultExportFunctionDeclaration ({DOM, HTTP: string}) {
  
}

// string (should not wrap)
export const str = 'string'

/* ExportSpecifier */
export {Component1 as X}
export {Component1, x}

// ExportDefaultSpecifier
export {Component2 as default}

export default ({DOM, HTTP: string}) => {}

export default isolate(Component3)

