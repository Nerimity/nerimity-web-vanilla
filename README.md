# Nerimity Web Vanilla WIP

Recreating Nerimity in vanilla JS instead of using a framework.  
live: https://vanilla.nerimity.com

### Feature comparison

The table below lists features of Vanilla (V) compared to [nerimity-web](https://github.com/Nerimity/nerimity-web/) (N)

| N  | V  | Feature                      | Event name                           |
|:--:|:--:|:---------------------------- |:------------------------------------ |
| ️✅ | ️✅ | Login                        |                                      |
| ️✅ |    | Register                     |                                      |
| ️✅ | ️✅ | Authentication               | `user:authenticated`                 |
| ️✅ |    | User Queue                   | `user:auth_queue_position`           |
| ️✅ | ️✅ | Authentification Error       | `user:authenticate_error`            |
| ️✅ |    | Profile Update               | `user:updatedSelf`                   |
| ️✅ |    | Other Users' Profile Update  | `user:updated`                       |
| ️✅ |    | Set Notice                   | `user:notice_created`                |
| ️✅ |    | Display Notice               |                                      |
| ️✅ |    | Add Connection               | `user:connection_added`              |
| ️✅ |    | Remove Connection            | `user:connection_removed`            |
| ️✅ |    | Google/Drive Integration     |                                      |
| ️✅ | ️✅ | Dismiss Notifications        | `notification:dismissed`             |
| ️✅ | ️✅ | Change Notification Settings | `user:notification_settings_update`  |
| ️✅ | ️✅ | Update Prescence             | `user:presence_update`               |
| ️✅ | ️✅ | Set Custom Prescence         |                                      |
| ️✅ |    | Block User                   | `user:blocked`                       |
| ️✅ |    | Unblock User                 | `user:unblocked`                     |
| ️✅ |    | Add Reminder                 | `user:reminder_add`                  |
| ️✅ |    | Update Reminder              | `user:reminder_update`               |
| ️✅ |    | Remove Reminder              | `user:reminder_remove`               |
| ️✅ | ️✅ | Friends                      |                                      |
| ️✅ | ️✅ | Friend Requests              | `friend:request_pending`             |
| ️✅ | ️✅ | Sending Requests             | `friend:request_sent`                |
| ️✅ | ️✅ | Accepting Requests           | `friend:request_accepted`            |
| ️✅ | ️✅ | Declining Requests           |                                      |
| ️✅ | ️✅ | Remove Friend                | `friend:removed`                     |
| ️✅ | ️✅ | Start DM                     | `inbox:opened`                       |
| ️✅ | ️✅ | Close DM                     | `inbox:closed`                       |
| ️✅ |    | Join Server                  | `server:joined`                      |
| ️✅ |    | Leave Server                 | `server:left`                        |
| ️✅ |    | Create Server                |                                      |
| ️✅ |    | Delete Server                |                                      |
| ️✅ |    | Schedule Deletion            | `server:schedule_delete`             |
| ️✅ |    | Unschedule Deletion          | `server:remove_schedule_delete`      |
| ️✅ | ️✅ | Change Server Order          | `server:order_updated`               |
| ️✅ |    | Create Folder                | `server:folder_created`              |
| ️✅ |    | Edit Folder                  | `server:folder_updated`              |
| ️✅ | ️✅ | Members                      | `server:members_fetched`             |
| ️✅ |    |                              | `server:member_joined`               |
| ️✅ |    |                              | `server:member_left`                 |
| ️✅ | ️✅ |                              | `server:member_updated`              |
| ️✅ |    | Server Settings              | `server:updated`                     |
| ️✅ |    | Set Clan Tag                 | `server:clan_updated`                |
| ️✅ |    | Create Role                  | `server:role_created`                |
| ️✅ | ️✅ | Edit Role                    | `server:role_updated`                |
| ️✅ | ️✅ | Delete Role                  | `server:role_deleted`                |
| ️✅ |    | Change Role Order            | `server:role_order_updated`          |
| ️✅ | ️✅ | Create Channel               | `server:channel_created`             |
| ️✅ |    | Edit Channel                 | `server:channel_updated`             |
| ️✅ | ️✅ | Delete Channel               | `server:channel_deleted`             |
| ️✅ |    | Change Channel Order         | `server:channel_order_updated`       |
| ️✅ |    | Change Channel Permissions   | `server:channel_permissions_updated` |
| ️✅ | ️✅ | Add Emoji                    | `server:emoji_add`                   |
| ️✅ | ️✅ | Edit Emoji                   | `server:emoji_remove`                |
| ️✅ | ️✅ | Delete Emoji                 | `server:emoji_update`                |
| ️✅ | ️✅ | System Messages              |                                      |
| ️✅ | ️✅ | Typing Indicators            | `channel:typing`                     |
| ️✅ | ️✅ | Mark Unread                  | `message:mark_unread`                |
| ️✅ | ️✅ | Send Message                 | `message:created`                    |
| ️✅ | ️✅ | Edit Message                 | `message:updated`                    |
| ️✅ | ️✅ | Delete Message               | `message:deleted`                    |
|    |    | Batch Delete                 | `message:deleted_batch`              |
| ️✅ | ️✅ | Add Reaction                 | `message:reaction_added`             |
| ️✅ | ️✅ | Remove Reaction              | `message:reaction_removed`           |
| ️✅ |    | Button Support               | `message:button_clicked_callback`    |
| ️✅ |    | Voice Calls                  | `voice:signal_received`              |
| ️✅ |    | Join Call                    | `voice:user_joined`                  |
| ️✅ |    | Leave Call                   | `voice:user_left`                    |
