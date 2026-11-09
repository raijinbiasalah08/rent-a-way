import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';
import 'package:rentaway_mobile/screens/auth_screen.dart';

const _postTypes = ['experience', 'question', 'tip'];

class CommunityScreen extends StatefulWidget {
  const CommunityScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  List<Map<String, dynamic>> _posts = [];
  String _filter = '';
  bool _loading = true;
  bool _posting = false;
  int _page = 1;
  int _totalPages = 1;
  String? _error;
  final _content = TextEditingController();
  String _type = 'experience';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _content.dispose();
    super.dispose();
  }

  Future<void> _load({int page = 1}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await widget.session.api.get(
        'community',
        query: {
          'page': '$page',
          'limit': '10',
          if (_filter.isNotEmpty) 'type': _filter,
        },
      );
      final data = response['data'];
      if (data is Map) {
        final posts = data['posts'];
        if (mounted) {
          setState(() {
            _posts = posts is List
                ? posts
                      .whereType<Map>()
                      .map((post) => Map<String, dynamic>.from(post))
                      .toList()
                : [];
            _page = int.tryParse(data['page']?.toString() ?? '') ?? 1;
            _totalPages =
                int.tryParse(data['totalPages']?.toString() ?? '') ?? 1;
          });
        }
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createPost() async {
    if (!widget.session.isSignedIn) {
      await Navigator.of(context).push<void>(
        MaterialPageRoute(builder: (_) => AuthScreen(session: widget.session)),
      );
      return;
    }
    final content = _content.text.trim();
    if (content.isEmpty) return;
    setState(() => _posting = true);
    try {
      await widget.session.api.post(
        'community',
        body: {'content': content, 'type': _type},
      );
      _content.clear();
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  Future<void> _like(Map<String, dynamic> post) async {
    if (!widget.session.isSignedIn) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Sign in to like a post.')));
      return;
    }
    try {
      final response = await widget.session.api.put(
        'community/${post['id']}/like',
      );
      final data = response['data'];
      if (data is Map && mounted) setState(() => post['likes'] = data['likes']);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Community')),
    body: RefreshIndicator(
      onRefresh: () => _load(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(15),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.session.user?['name']?.toString() ??
                        'Roxas rental community',
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _content,
                    maxLength: 5000,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText:
                          'Share an experience, ask a question, or offer a tip.',
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _type,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            labelText: 'Post type',
                          ),
                          items: _postTypes
                              .map(
                                (type) => DropdownMenuItem(
                                  value: type,
                                  child: Text(
                                    type[0].toUpperCase() + type.substring(1),
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) {
                            if (value != null) setState(() => _type = value);
                          },
                        ),
                      ),
                      const SizedBox(width: 10),
                      FilledButton(
                        onPressed: _posting ? null : _createPost,
                        child: _posting
                            ? const SizedBox.square(
                                dimension: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Post'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final filter in ['', ..._postTypes])
                  Padding(
                    padding: const EdgeInsets.only(right: 7),
                    child: ChoiceChip(
                      label: Text(
                        filter.isEmpty
                            ? 'All posts'
                            : filter[0].toUpperCase() + filter.substring(1),
                      ),
                      selected: _filter == filter,
                      onSelected: (_) {
                        setState(() => _filter = filter);
                        _load();
                      },
                    ),
                  ),
              ],
            ),
          ),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (_error != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    TextButton(
                      onPressed: () => _load(),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            )
          else if (_posts.isEmpty)
            const Padding(
              padding: EdgeInsets.all(32),
              child: Text(
                'No posts yet. Share something with the community.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.black54),
              ),
            )
          else ...[
            for (final post in _posts)
              _PostCard(post: post, onLike: () => _like(post)),
            if (_totalPages > 1)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: _page > 1 ? () => _load(page: _page - 1) : null,
                    child: const Text('Previous'),
                  ),
                  Text(
                    '$_page of $_totalPages',
                    style: const TextStyle(color: Colors.black54),
                  ),
                  TextButton(
                    onPressed: _page < _totalPages
                        ? () => _load(page: _page + 1)
                        : null,
                    child: const Text('Next'),
                  ),
                ],
              ),
          ],
        ],
      ),
    ),
  );
}

class _PostCard extends StatelessWidget {
  const _PostCard({required this.post, required this.onLike});
  final Map<String, dynamic> post;
  final VoidCallback onLike;

  @override
  Widget build(BuildContext context) {
    final createdAt = DateTime.tryParse(post['created_at']?.toString() ?? '');
    final type = post['type']?.toString() ?? 'experience';
    return Card(
      margin: const EdgeInsets.only(top: 10),
      child: Padding(
        padding: const EdgeInsets.all(15),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: const Color(0xFFE8EDF4),
                  child: Text(
                    (post['author_name']?.toString().isNotEmpty ?? false)
                        ? post['author_name'].toString()[0].toUpperCase()
                        : '?',
                    style: const TextStyle(
                      color: Color(0xFF0F1729),
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        post['author_name']?.toString() ?? 'Member',
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      if (createdAt != null)
                        Text(
                          DateFormat('MMM d · h:mm a').format(createdAt),
                          style: const TextStyle(
                            color: Colors.black54,
                            fontSize: 12,
                          ),
                        ),
                    ],
                  ),
                ),
                Chip(
                  label: Text(type, style: const TextStyle(fontSize: 11)),
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              post['content']?.toString() ?? '',
              style: const TextStyle(height: 1.45),
            ),
            const Divider(height: 22),
            TextButton.icon(
              onPressed: onLike,
              icon: const Icon(Icons.thumb_up_alt_outlined, size: 18),
              label: Text('${post['likes'] ?? 0} likes'),
            ),
          ],
        ),
      ),
    );
  }
}
