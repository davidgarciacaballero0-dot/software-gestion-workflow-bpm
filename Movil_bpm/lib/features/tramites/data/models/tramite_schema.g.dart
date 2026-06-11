// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tramite_schema.dart';

// **************************************************************************
// IsarCollectionGenerator
// **************************************************************************

// coverage:ignore-file
// ignore_for_file: duplicate_ignore, non_constant_identifier_names, constant_identifier_names, invalid_use_of_protected_member, unnecessary_cast, prefer_const_constructors, lines_longer_than_80_chars, require_trailing_commas, inference_failure_on_function_invocation, unnecessary_parenthesis, unnecessary_raw_strings, unnecessary_null_checks, join_return_with_assignment, prefer_final_locals, avoid_js_rounded_ints, avoid_positional_boolean_parameters, always_specify_types

extension GetTramiteOfflineCollection on Isar {
  IsarCollection<TramiteOffline> get tramiteOfflines => this.collection();
}

const TramiteOfflineSchema = CollectionSchema(
  name: r'TramiteOffline',
  id: -1077871250667796137,
  properties: {
    r'fechaCreacion': PropertySchema(
      id: 0,
      name: r'fechaCreacion',
      type: IsarType.dateTime,
    ),
    r'jsonFormularioData': PropertySchema(
      id: 1,
      name: r'jsonFormularioData',
      type: IsarType.string,
    ),
    r'localId': PropertySchema(
      id: 2,
      name: r'localId',
      type: IsarType.string,
    ),
    r'nombreTramite': PropertySchema(
      id: 3,
      name: r'nombreTramite',
      type: IsarType.string,
    ),
    r'synced': PropertySchema(
      id: 4,
      name: r'synced',
      type: IsarType.bool,
    )
  },
  estimateSize: _tramiteOfflineEstimateSize,
  serialize: _tramiteOfflineSerialize,
  deserialize: _tramiteOfflineDeserialize,
  deserializeProp: _tramiteOfflineDeserializeProp,
  idName: r'id',
  indexes: {
    r'localId': IndexSchema(
      id: 1199848425898359622,
      name: r'localId',
      unique: true,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'localId',
          type: IndexType.hash,
          caseSensitive: true,
        )
      ],
    ),
    r'fechaCreacion': IndexSchema(
      id: 3471812336142411217,
      name: r'fechaCreacion',
      unique: false,
      replace: false,
      properties: [
        IndexPropertySchema(
          name: r'fechaCreacion',
          type: IndexType.value,
          caseSensitive: false,
        )
      ],
    )
  },
  links: {},
  embeddedSchemas: {},
  getId: _tramiteOfflineGetId,
  getLinks: _tramiteOfflineGetLinks,
  attach: _tramiteOfflineAttach,
  version: '3.1.0+1',
);

int _tramiteOfflineEstimateSize(
  TramiteOffline object,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  var bytesCount = offsets.last;
  bytesCount += 3 + object.jsonFormularioData.length * 3;
  bytesCount += 3 + object.localId.length * 3;
  bytesCount += 3 + object.nombreTramite.length * 3;
  return bytesCount;
}

void _tramiteOfflineSerialize(
  TramiteOffline object,
  IsarWriter writer,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  writer.writeDateTime(offsets[0], object.fechaCreacion);
  writer.writeString(offsets[1], object.jsonFormularioData);
  writer.writeString(offsets[2], object.localId);
  writer.writeString(offsets[3], object.nombreTramite);
  writer.writeBool(offsets[4], object.synced);
}

TramiteOffline _tramiteOfflineDeserialize(
  Id id,
  IsarReader reader,
  List<int> offsets,
  Map<Type, List<int>> allOffsets,
) {
  final object = TramiteOffline();
  object.fechaCreacion = reader.readDateTime(offsets[0]);
  object.id = id;
  object.jsonFormularioData = reader.readString(offsets[1]);
  object.localId = reader.readString(offsets[2]);
  object.nombreTramite = reader.readString(offsets[3]);
  object.synced = reader.readBool(offsets[4]);
  return object;
}

P _tramiteOfflineDeserializeProp<P>(
  IsarReader reader,
  int propertyId,
  int offset,
  Map<Type, List<int>> allOffsets,
) {
  switch (propertyId) {
    case 0:
      return (reader.readDateTime(offset)) as P;
    case 1:
      return (reader.readString(offset)) as P;
    case 2:
      return (reader.readString(offset)) as P;
    case 3:
      return (reader.readString(offset)) as P;
    case 4:
      return (reader.readBool(offset)) as P;
    default:
      throw IsarError('Unknown property with id $propertyId');
  }
}

Id _tramiteOfflineGetId(TramiteOffline object) {
  return object.id;
}

List<IsarLinkBase<dynamic>> _tramiteOfflineGetLinks(TramiteOffline object) {
  return [];
}

void _tramiteOfflineAttach(
    IsarCollection<dynamic> col, Id id, TramiteOffline object) {
  object.id = id;
}

extension TramiteOfflineByIndex on IsarCollection<TramiteOffline> {
  Future<TramiteOffline?> getByLocalId(String localId) {
    return getByIndex(r'localId', [localId]);
  }

  TramiteOffline? getByLocalIdSync(String localId) {
    return getByIndexSync(r'localId', [localId]);
  }

  Future<bool> deleteByLocalId(String localId) {
    return deleteByIndex(r'localId', [localId]);
  }

  bool deleteByLocalIdSync(String localId) {
    return deleteByIndexSync(r'localId', [localId]);
  }

  Future<List<TramiteOffline?>> getAllByLocalId(List<String> localIdValues) {
    final values = localIdValues.map((e) => [e]).toList();
    return getAllByIndex(r'localId', values);
  }

  List<TramiteOffline?> getAllByLocalIdSync(List<String> localIdValues) {
    final values = localIdValues.map((e) => [e]).toList();
    return getAllByIndexSync(r'localId', values);
  }

  Future<int> deleteAllByLocalId(List<String> localIdValues) {
    final values = localIdValues.map((e) => [e]).toList();
    return deleteAllByIndex(r'localId', values);
  }

  int deleteAllByLocalIdSync(List<String> localIdValues) {
    final values = localIdValues.map((e) => [e]).toList();
    return deleteAllByIndexSync(r'localId', values);
  }

  Future<Id> putByLocalId(TramiteOffline object) {
    return putByIndex(r'localId', object);
  }

  Id putByLocalIdSync(TramiteOffline object, {bool saveLinks = true}) {
    return putByIndexSync(r'localId', object, saveLinks: saveLinks);
  }

  Future<List<Id>> putAllByLocalId(List<TramiteOffline> objects) {
    return putAllByIndex(r'localId', objects);
  }

  List<Id> putAllByLocalIdSync(List<TramiteOffline> objects,
      {bool saveLinks = true}) {
    return putAllByIndexSync(r'localId', objects, saveLinks: saveLinks);
  }
}

extension TramiteOfflineQueryWhereSort
    on QueryBuilder<TramiteOffline, TramiteOffline, QWhere> {
  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhere> anyId() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(const IdWhereClause.any());
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhere> anyFechaCreacion() {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        const IndexWhereClause.any(indexName: r'fechaCreacion'),
      );
    });
  }
}

extension TramiteOfflineQueryWhere
    on QueryBuilder<TramiteOffline, TramiteOffline, QWhereClause> {
  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause> idEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: id,
        upper: id,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause> idNotEqualTo(
      Id id) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            )
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            );
      } else {
        return query
            .addWhereClause(
              IdWhereClause.greaterThan(lower: id, includeLower: false),
            )
            .addWhereClause(
              IdWhereClause.lessThan(upper: id, includeUpper: false),
            );
      }
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause> idGreaterThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.greaterThan(lower: id, includeLower: include),
      );
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause> idLessThan(
      Id id,
      {bool include = false}) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(
        IdWhereClause.lessThan(upper: id, includeUpper: include),
      );
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause> idBetween(
    Id lowerId,
    Id upperId, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IdWhereClause.between(
        lower: lowerId,
        includeLower: includeLower,
        upper: upperId,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      localIdEqualTo(String localId) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'localId',
        value: [localId],
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      localIdNotEqualTo(String localId) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'localId',
              lower: [],
              upper: [localId],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'localId',
              lower: [localId],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'localId',
              lower: [localId],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'localId',
              lower: [],
              upper: [localId],
              includeUpper: false,
            ));
      }
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      fechaCreacionEqualTo(DateTime fechaCreacion) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.equalTo(
        indexName: r'fechaCreacion',
        value: [fechaCreacion],
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      fechaCreacionNotEqualTo(DateTime fechaCreacion) {
    return QueryBuilder.apply(this, (query) {
      if (query.whereSort == Sort.asc) {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'fechaCreacion',
              lower: [],
              upper: [fechaCreacion],
              includeUpper: false,
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'fechaCreacion',
              lower: [fechaCreacion],
              includeLower: false,
              upper: [],
            ));
      } else {
        return query
            .addWhereClause(IndexWhereClause.between(
              indexName: r'fechaCreacion',
              lower: [fechaCreacion],
              includeLower: false,
              upper: [],
            ))
            .addWhereClause(IndexWhereClause.between(
              indexName: r'fechaCreacion',
              lower: [],
              upper: [fechaCreacion],
              includeUpper: false,
            ));
      }
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      fechaCreacionGreaterThan(
    DateTime fechaCreacion, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.between(
        indexName: r'fechaCreacion',
        lower: [fechaCreacion],
        includeLower: include,
        upper: [],
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      fechaCreacionLessThan(
    DateTime fechaCreacion, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.between(
        indexName: r'fechaCreacion',
        lower: [],
        upper: [fechaCreacion],
        includeUpper: include,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterWhereClause>
      fechaCreacionBetween(
    DateTime lowerFechaCreacion,
    DateTime upperFechaCreacion, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addWhereClause(IndexWhereClause.between(
        indexName: r'fechaCreacion',
        lower: [lowerFechaCreacion],
        includeLower: includeLower,
        upper: [upperFechaCreacion],
        includeUpper: includeUpper,
      ));
    });
  }
}

extension TramiteOfflineQueryFilter
    on QueryBuilder<TramiteOffline, TramiteOffline, QFilterCondition> {
  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      fechaCreacionEqualTo(DateTime value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'fechaCreacion',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      fechaCreacionGreaterThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'fechaCreacion',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      fechaCreacionLessThan(
    DateTime value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'fechaCreacion',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      fechaCreacionBetween(
    DateTime lower,
    DateTime upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'fechaCreacion',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition> idEqualTo(
      Id value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      idGreaterThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      idLessThan(
    Id value, {
    bool include = false,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'id',
        value: value,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition> idBetween(
    Id lower,
    Id upper, {
    bool includeLower = true,
    bool includeUpper = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'id',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'jsonFormularioData',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'jsonFormularioData',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'jsonFormularioData',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'jsonFormularioData',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      jsonFormularioDataIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'jsonFormularioData',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'localId',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'localId',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'localId',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'localId',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      localIdIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'localId',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteEqualTo(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteGreaterThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        include: include,
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteLessThan(
    String value, {
    bool include = false,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.lessThan(
        include: include,
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteBetween(
    String lower,
    String upper, {
    bool includeLower = true,
    bool includeUpper = true,
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.between(
        property: r'nombreTramite',
        lower: lower,
        includeLower: includeLower,
        upper: upper,
        includeUpper: includeUpper,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteStartsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.startsWith(
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteEndsWith(
    String value, {
    bool caseSensitive = true,
  }) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.endsWith(
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteContains(String value, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.contains(
        property: r'nombreTramite',
        value: value,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteMatches(String pattern, {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.matches(
        property: r'nombreTramite',
        wildcard: pattern,
        caseSensitive: caseSensitive,
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteIsEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'nombreTramite',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      nombreTramiteIsNotEmpty() {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.greaterThan(
        property: r'nombreTramite',
        value: '',
      ));
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterFilterCondition>
      syncedEqualTo(bool value) {
    return QueryBuilder.apply(this, (query) {
      return query.addFilterCondition(FilterCondition.equalTo(
        property: r'synced',
        value: value,
      ));
    });
  }
}

extension TramiteOfflineQueryObject
    on QueryBuilder<TramiteOffline, TramiteOffline, QFilterCondition> {}

extension TramiteOfflineQueryLinks
    on QueryBuilder<TramiteOffline, TramiteOffline, QFilterCondition> {}

extension TramiteOfflineQuerySortBy
    on QueryBuilder<TramiteOffline, TramiteOffline, QSortBy> {
  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByFechaCreacion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fechaCreacion', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByFechaCreacionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fechaCreacion', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByJsonFormularioData() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'jsonFormularioData', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByJsonFormularioDataDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'jsonFormularioData', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> sortByLocalId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localId', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByLocalIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localId', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByNombreTramite() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nombreTramite', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortByNombreTramiteDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nombreTramite', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> sortBySynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'synced', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      sortBySyncedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'synced', Sort.desc);
    });
  }
}

extension TramiteOfflineQuerySortThenBy
    on QueryBuilder<TramiteOffline, TramiteOffline, QSortThenBy> {
  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByFechaCreacion() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fechaCreacion', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByFechaCreacionDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'fechaCreacion', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> thenById() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> thenByIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'id', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByJsonFormularioData() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'jsonFormularioData', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByJsonFormularioDataDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'jsonFormularioData', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> thenByLocalId() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localId', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByLocalIdDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'localId', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByNombreTramite() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nombreTramite', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenByNombreTramiteDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'nombreTramite', Sort.desc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy> thenBySynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'synced', Sort.asc);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QAfterSortBy>
      thenBySyncedDesc() {
    return QueryBuilder.apply(this, (query) {
      return query.addSortBy(r'synced', Sort.desc);
    });
  }
}

extension TramiteOfflineQueryWhereDistinct
    on QueryBuilder<TramiteOffline, TramiteOffline, QDistinct> {
  QueryBuilder<TramiteOffline, TramiteOffline, QDistinct>
      distinctByFechaCreacion() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'fechaCreacion');
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QDistinct>
      distinctByJsonFormularioData({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'jsonFormularioData',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QDistinct> distinctByLocalId(
      {bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'localId', caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QDistinct>
      distinctByNombreTramite({bool caseSensitive = true}) {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'nombreTramite',
          caseSensitive: caseSensitive);
    });
  }

  QueryBuilder<TramiteOffline, TramiteOffline, QDistinct> distinctBySynced() {
    return QueryBuilder.apply(this, (query) {
      return query.addDistinctBy(r'synced');
    });
  }
}

extension TramiteOfflineQueryProperty
    on QueryBuilder<TramiteOffline, TramiteOffline, QQueryProperty> {
  QueryBuilder<TramiteOffline, int, QQueryOperations> idProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'id');
    });
  }

  QueryBuilder<TramiteOffline, DateTime, QQueryOperations>
      fechaCreacionProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'fechaCreacion');
    });
  }

  QueryBuilder<TramiteOffline, String, QQueryOperations>
      jsonFormularioDataProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'jsonFormularioData');
    });
  }

  QueryBuilder<TramiteOffline, String, QQueryOperations> localIdProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'localId');
    });
  }

  QueryBuilder<TramiteOffline, String, QQueryOperations>
      nombreTramiteProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'nombreTramite');
    });
  }

  QueryBuilder<TramiteOffline, bool, QQueryOperations> syncedProperty() {
    return QueryBuilder.apply(this, (query) {
      return query.addPropertyName(r'synced');
    });
  }
}
