import {RawClientSideBasePluginConfig} from '@graphql-codegen/visitor-plugin-common';

export interface EffectorRawPluginConfig extends RawClientSideBasePluginConfig {

  baseClientPath: string
  clientName: string
}