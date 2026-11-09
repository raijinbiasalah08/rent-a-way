import 'dart:async';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:rentaway_mobile/core/api_client.dart';
import 'package:rentaway_mobile/core/session_controller.dart';

class InboxScreen extends StatefulWidget {
  const InboxScreen({super.key, required this.session});
  final SessionController session;

  @override
  State<InboxScreen> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxScreen> {
  List<Map<String, dynamic>> _conversations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await widget.session.api.get('messages/conversations');
      final data = response['data'];
      if (mounted) {
        setState(
          () => _conversations = data is List
              ? data
                    .whereType<Map>()
                    .map((item) => Map<String, dynamic>.from(item))
                    .toList()
              : [],
        );
      }
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Map<String, dynamic> conversation) async {
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) =>
            ChatScreen(session: widget.session, otherUser: conversation),
      ),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Messages')),
    body: RefreshIndicator(
      onRefresh: _load,
      child: _loading
          ? ListView(
              children: [
                SizedBox(
                  height: 240,
                  child: Center(child: CircularProgressIndicator()),
                ),
              ],
            )
          : _error != null
          ? ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    children: [
                      Text(_error!, textAlign: TextAlign.center),
                      TextButton(
                        onPressed: _load,
                        child: const Text('Try again'),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : _conversations.isEmpty
          ? ListView(
              children: [
                Padding(
                  padding: EdgeInsets.all(40),
                  child: Column(
                    children: [
                      Icon(
                        Icons.forum_outlined,
                        size: 44,
                        color: Color(0xFF718096),
                      ),
                      SizedBox(height: 12),
                      Text(
                        'No conversations yet.',
                        style: TextStyle(color: Colors.black54),
                      ),
                    ],
                  ),
                ),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.all(14),
              itemCount: _conversations.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final conversation = _conversations[index];
                final name =
                    conversation['name']?.toString() ?? 'Rent-A-Way member';
                final unread =
                    int.tryParse(
                      conversation['unread_count']?.toString() ?? '',
                    ) ??
                    0;
                return Card(
                  child: ListTile(
                    onTap: () => _open(conversation),
                    leading: CircleAvatar(
                      backgroundColor: const Color(0xFFE8EDF4),
                      child: Text(
                        name.isEmpty ? '?' : name[0].toUpperCase(),
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F1729),
                        ),
                      ),
                    ),
                    title: Text(
                      name,
                      style: const TextStyle(fontWeight: FontWeight.w800),
                    ),
                    subtitle: Text(
                      conversation['last_message']?.toString() ??
                          'Open conversation',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: unread > 0
                        ? CircleAvatar(
                            radius: 13,
                            backgroundColor: const Color(0xFF1F4F91),
                            child: Text(
                              '$unread',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 11,
                              ),
                            ),
                          )
                        : const Icon(Icons.chevron_right_rounded),
                  ),
                );
              },
            ),
    ),
  );
}

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key, required this.session, required this.otherUser});
  final SessionController session;
  final Map<String, dynamic> otherUser;

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _composer = TextEditingController();
  final _scroll = ScrollController();
  Timer? _poll;
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  bool _sending = false;
  bool _blocked = false;
  String? _error;

  String get _otherId => widget.otherUser['other_user_id']?.toString() ?? '';

  @override
  void initState() {
    super.initState();
    _load();
    _poll = Timer.periodic(
      const Duration(seconds: 6),
      (_) => _load(silent: true),
    );
  }

  @override
  void dispose() {
    _poll?.cancel();
    _composer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    try {
      final response = await widget.session.api.get(
        'messages/$_otherId',
        query: const {'limit': '50'},
      );
      final data = response['data'];
      if (!mounted) return;
      setState(() {
        _messages = data is List
            ? data
                  .whereType<Map>()
                  .map((item) => Map<String, dynamic>.from(item))
                  .toList()
            : [];
        _blocked = response['blocked'] == true;
        _error = null;
        _loading = false;
      });
      if (!silent && _scroll.hasClients) {
        _scroll.jumpTo(_scroll.position.maxScrollExtent);
      }
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.message;
        _loading = false;
      });
    }
  }

  Future<void> _send() async {
    final content = _composer.text.trim();
    if (content.isEmpty) return;
    setState(() => _sending = true);
    try {
      await widget.session.api.post(
        'messages',
        body: {'receiver_id': _otherId, 'content': content, 'type': 'text'},
      );
      _composer.clear();
      await _load();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myId = widget.session.user?['id']?.toString();
    final name = widget.otherUser['name']?.toString() ?? 'Conversation';
    return Scaffold(
      appBar: AppBar(
        title: Text(name, maxLines: 1, overflow: TextOverflow.ellipsis),
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_error!, textAlign: TextAlign.center),
                          TextButton(
                            onPressed: _load,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : _blocked
                ? const Center(child: Text('This conversation is blocked.'))
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.all(14),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final mine = message['sender_id']?.toString() == myId;
                      final date = DateTime.tryParse(
                        message['created_at']?.toString() ?? '',
                      );
                      return Align(
                        alignment: mine
                            ? Alignment.centerRight
                            : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 9),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 13,
                            vertical: 10,
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.sizeOf(context).width * .78,
                          ),
                          decoration: BoxDecoration(
                            color: mine
                                ? const Color(0xFF17345A)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  message['content']?.toString() ?? '',
                                  style: TextStyle(
                                    color: mine
                                        ? Colors.white
                                        : const Color(0xFF222B38),
                                    height: 1.35,
                                  ),
                                ),
                              ),
                              if (date != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 5),
                                  child: Text(
                                    DateFormat('h:mm a').format(date),
                                    style: TextStyle(
                                      color: mine
                                          ? Colors.white70
                                          : Colors.black45,
                                      fontSize: 10,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _composer,
                      minLines: 1,
                      maxLines: 4,
                      maxLength: 5000,
                      decoration: const InputDecoration(
                        hintText: 'Write a message',
                        counterText: '',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: 'Send message',
                    onPressed: _sending || _blocked ? null : _send,
                    icon: _sending
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.send_rounded),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
