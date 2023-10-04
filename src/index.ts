import {oldVisit, PluginFunction, Types} from "@graphql-codegen/plugin-helpers";
import {concatAST, FragmentDefinitionNode, GraphQLSchema, Kind} from "graphql";
import {LoadedFragment} from "@graphql-codegen/visitor-plugin-common";
import {EffectorRawPluginConfig} from "./config";
import {EffectorVisitor} from "./visitor";


export const plugin: PluginFunction<EffectorRawPluginConfig, Types.ComplexPluginOutput> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: EffectorRawPluginConfig,
) => {
  const allAst = concatAST(documents.map(v => v.document));

  const allFragments: LoadedFragment[] = [
    ...(
      allAst.definitions.filter(
        d => d.kind === Kind.FRAGMENT_DEFINITION,
      ) as FragmentDefinitionNode[]
    ).map(fragmentDef => ({
      node: fragmentDef,
      name: fragmentDef.name.value,
      onType: fragmentDef.typeCondition.name.value,
      isExternal: false,
    })),
    ...(config.externalFragments || []),
  ];

  const visitor = new EffectorVisitor(schema, allFragments, config, documents)
  const visitorResult = oldVisit(allAst, {leave: visitor});

  return {
    prepend: visitor.getImports(),
    content: [
      visitor.fragments,
      ...visitorResult.definitions.filter((t: unknown) => typeof t === 'string'),
    ].join('\n'),
  };
}