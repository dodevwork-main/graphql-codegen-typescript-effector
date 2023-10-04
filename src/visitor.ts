import autoBind from 'auto-bind'

import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  DocumentMode,
  getConfigValue,
  LoadedFragment
} from "@graphql-codegen/visitor-plugin-common";
import {EffectorRawPluginConfig} from "./config";
import {GraphQLSchema, OperationDefinitionNode} from "graphql";
import {Types} from "@graphql-codegen/plugin-helpers";

export interface EffectorPluginConfig extends ClientSideBasePluginConfig {
  baseClientPath: string
  clientName: string
}

export class EffectorVisitor extends ClientSideBaseVisitor<EffectorRawPluginConfig, EffectorPluginConfig> {
  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    protected rawConfig: EffectorRawPluginConfig,
    documents: Types.DocumentFile[],
  ) {
    super(schema, fragments, rawConfig, {
      baseClientPath: getConfigValue(rawConfig.baseClientPath, ''),
      clientName: getConfigValue(rawConfig.clientName, 'client'),
      gqlImport: getConfigValue(
        rawConfig.gqlImport,
        `@apollo/client#gql`,
      ),
    });

    autoBind(this);
  }

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string,
  ): string {
    const {baseClientPath, clientName} = this.config
    const nodeName = node.name?.value ?? '';
    const lowerCaseFirstLetterName = nodeName[0].toLowerCase() + nodeName.slice(1)
    const nodeDocument = this.getDocumentNodeVariable(node, documentVariableName)

    this._imports.add(`import { ${clientName} } from '${baseClientPath}'`)
    this._imports.add(`import { createEffect } from 'effector'`)

    let effect: string

    if (operationType === 'Query') {
      this._imports.add(`import { QueryOptions, ApolloQueryResult } from '@apollo/client'`)

      effect =
        `export const ${lowerCaseFirstLetterName}Fx = createEffect<
          Omit<QueryOptions<${operationVariablesTypes}, ${operationResultType}>, 'query'>,
          ApolloQueryResult<${operationResultType}>
          >({
            async handler(options) {
            return ${clientName}.query<${operationResultType}, ${operationVariablesTypes}>({
              query: ${nodeDocument}, 
              ...options
            })
           },
        })`


    } else if (operationType === 'Mutation') {
      this._imports.add(`import { MutationFunctionOptions, FetchResult } from '@apollo/client'`)

      effect =
        `export const ${lowerCaseFirstLetterName}Fx = createEffect<
          Omit<MutationFunctionOptions<${operationResultType}, ${operationVariablesTypes}>, 'mutation'>,
          FetchResult<${operationResultType}>
          >({
            async handler(options) {
            return ${clientName}.mutate<${operationResultType}, ${operationVariablesTypes}>({
              mutation: ${nodeDocument}, 
              ...options
            })
           },
        })`

    }

    return [effect].filter(a => a).join('\n');
  }

  private getDocumentNodeVariable(
    node: OperationDefinitionNode,
    documentVariableName: string,
  ): string {
    return this.config.documentMode === DocumentMode.external
      ? `Operations.${node.name?.value ?? ''}`
      : documentVariableName;
  }
}