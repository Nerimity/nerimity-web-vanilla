# Nerimity Web Vanilla WIP

Recreating Nerimity in vanilla JS instead of using a framework.  
live: https://vanilla.nerimity.com

### Feature comparison

The table below lists features of Vanilla (V) compared to [nerimity-web](https://github.com/Nerimity/nerimity-web/) (N)

|  N  |  V  | Feature                      | Event name                           |
|:---:|:---:|:---------------------------- |:------------------------------------ |
| [x] | [x] | Login                        |                                      |
| [x] | [ ] | Register                     |                                      |
| [x] | [x] | Authentication               | `user:authenticated`                 |
| [x] | [ ] | User Queue                   | `user:auth_queue_position`           |
| [x] | [x] | Authentification Error       | `user:authenticate_error`            |
| [x] | [ ] | Profile Update               | `user:updatedSelf`                   |
| [x] | [ ] | Other Users' Profile Update  | `user:updated`                       |
| [x] | [ ] | Set Notice                   | `user:notice_created`                |
| [x] | [ ] | Display Notice               |                                      |
| [x] | [ ] | Add Connection               | `user:connection_added`              |
| [x] | [ ] | Remove Connection            | `user:connection_removed`            |
| [x] | [ ] | Google/Drive Integration     |                                      |
| [x] | [x] | Dismiss Notifications        | `notification:dismissed`             |
| [x] | [x] | Change Notification Settings | `user:notification_settings_update`  |
| [x] | [x] | Update Prescence             | `user:presence_update`               |
| [x] | [x] | Set Custom Prescence         |                                      |
| [x] | [ ] | Block User                   | `user:blocked`                       |
| [x] | [ ] | Unblock User                 | `user:unblocked`                     |
| [x] | [ ] | Add Reminder                 | `user:reminder_add`                  |
| [x] | [ ] | Update Reminder              | `user:reminder_update`               |
| [x] | [ ] | Remove Reminder              | `user:reminder_remove`               |
| [x] | [x] | Friends                      |                                      |
| [x] | [x] | Friend Requests              | `friend:request_pending`             |
| [x] | [x] | Sending Requests             | `friend:request_sent`                |
| [x] | [x] | Accepting Requests           | `friend:request_accepted`            |
| [x] | [x] | Declining Requests           |                                      |
| [x] | [x] | Remove Friend                | `friend:removed`                     |
| [x] | [x] | Start DM                     | `inbox:opened`                       |
| [x] | [x] | Close DM                     | `inbox:closed`                       |
| [x] | [ ] | Join Server                  | `server:joined`                      |
| [x] | [ ] | Leave Server                 | `server:left`                        |
| [x] | [ ] | Create Server                |                                      |
| [x] | [ ] | Delete Server                |                                      |
| [x] | [ ] | Schedule Deletion            | `server:schedule_delete`             |
| [x] | [ ] | Unschedule Deletion          | `server:remove_schedule_delete`      |
| [x] | [x] | Change Server Order          | `server:order_updated`               |
| [x] | [ ] | Create Folder                | `server:folder_created`              |
| [x] | [ ] | Edit Folder                  | `server:folder_updated`              |
| [x] | [x] | Members                      | `server:members_fetched`             |
| [x] | [ ] |                              | `server:member_joined`               |
| [x] | [ ] |                              | `server:member_left`                 |
| [x] | [x] |                              | `server:member_updated`              |
| [x] | [ ] | Server Settings              | `server:updated`                     |
| [x] | [ ] | Set Clan Tag                 | `server:clan_updated`                |
| [x] | [ ] | Create Role                  | `server:role_created`                |
| [x] | [x] | Edit Role                    | `server:role_updated`                |
| [x] | [x] | Delete Role                  | `server:role_deleted`                |
| [x] | [ ] | Change Role Order            | `server:role_order_updated`          |
| [x] | [x] | Create Channel               | `server:channel_created`             |
| [x] | [ ] | Edit Channel                 | `server:channel_updated`             |
| [x] | [x] | Delete Channel               | `server:channel_deleted`             |
| [x] | [ ] | Change Channel Order         | `server:channel_order_updated`       |
| [x] | [ ] | Change Channel Permissions   | `server:channel_permissions_updated` |
| [x] | [x] | Add Emoji                    | `server:emoji_add`                   |
| [x] | [x] | Edit Emoji                   | `server:emoji_remove`                |
| [x] | [x] | Delete Emoji                 | `server:emoji_update`                |
| [x] | [x] | System Messages              |                                      |
| [x] | [x] | Typing Indicators            | `channel:typing`                     |
| [x] | [x] | Mark Unread                  | `message:mark_unread`                |
| [x] | [x] | Send Message                 | `message:created`                    |
| [x] | [x] | Edit Message                 | `message:updated`                    |
| [x] | [x] | Delete Message               | `message:deleted`                    |
| [ ] | [ ] | Batch Delete                 | `message:deleted_batch`              |
| [x] | [x] | Add Reaction                 | `message:reaction_added`             |
| [x] | [x] | Remove Reaction              | `message:reaction_removed`           |
| [x] | [ ] | Button Support               | `message:button_clicked_callback`    |
| [x] | [ ] | Voice Calls                  | `voice:signal_received`              |
| [x] | [ ] | Join Call                    | `voice:user_joined`                  |
| [x] | [ ] | Leave Call                   | `voice:user_left`                    |
