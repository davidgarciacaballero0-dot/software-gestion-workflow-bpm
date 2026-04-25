// ─────────────────────────────────────────────────────────────
// lib/features/catalog/presentation/screens/catalog_screen.dart
// ─────────────────────────────────────────────────────────────

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:animate_do/animate_do.dart';
import 'package:workflow_app/core/theme/app_theme.dart';
import '../providers/catalog_providers.dart';

class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final catalogAsync = ref.watch(catalogPoliciesProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Catálogo de Trámites'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppTheme.primary),
            onPressed: () => ref.invalidate(catalogPoliciesProvider),
          ),
        ],
      ),
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topRight,
            radius: 1.5,
            colors: [Color(0x1A070235), Colors.white],
          ),
        ),
        child: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(catalogPoliciesProvider);
          },
          child: catalogAsync.when(
            data: (policies) {
              if (policies.isEmpty) {
                return _EmptyCatalogState();
              }

              return ListView.separated(
                padding: const EdgeInsets.only(left: 24, right: 24, bottom: 24, top: 100),
                itemCount: policies.length,
                separatorBuilder: (_, __) => const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final policy = policies[index];
                  return FadeInUp(
                    delay: Duration(milliseconds: 100 * index),
                    child: _PolicyCard(
                      policyName: policy.nombre,
                      policyDesc: policy.description,
                      onTap: () {
                        context.push('/start-procedure', extra: policy);
                      },
                    ),
                  );
                },
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (err, stack) => Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Text(
                  'Error al cargar el catálogo:\n$err',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppTheme.error),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _PolicyCard extends StatelessWidget {
  final String policyName;
  final String policyDesc;
  final VoidCallback onTap;

  const _PolicyCard({
    required this.policyName,
    required this.policyDesc,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.ghostBorder),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primary.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.account_balance_wallet_outlined,
                        color: AppTheme.primary,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        policyName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  policyDesc.isNotEmpty ? policyDesc : 'Sin descripción disponible.',
                  style: const TextStyle(color: AppTheme.subtle, fontSize: 13),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                Align(
                  alignment: Alignment.centerRight,
                  child: ElevatedButton.icon(
                    onPressed: onTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      minimumSize: Size.zero,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: const Icon(Icons.play_arrow_rounded, size: 18),
                    label: const Text('Iniciar Trámite', style: TextStyle(fontSize: 12)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


class _EmptyCatalogState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Container(
        height: MediaQuery.of(context).size.height * 0.7,
        alignment: Alignment.center,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inventory_2_outlined, size: 64, color: AppTheme.subtle.withValues(alpha: 0.5)),
            const SizedBox(height: 16),
            Text(
              'No hay trámites disponibles',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: AppTheme.subtle,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
