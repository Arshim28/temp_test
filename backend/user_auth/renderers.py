from base.renderers import BaseJSONRenderer
import uuid


class UserJSONRenderer(BaseJSONRenderer):
    charset = "utf-8"
    object_label = "user"
    pagination_object_label = "users"
    pagination_count_label = "usersCount"

    def render(self, data, media_type=None, renderer_context=None):
        # If we recieve a `token` key as part of the response, it will by a
        # byte object. Byte objects don't serializer well, so we need to
        # decode it before rendering the User object.
        token = data.get("token", None)
        id = data.get("id", None)

        if token is not None and isinstance(token, bytes):
            # Also as mentioned above, we will decode `token` if it is of type
            # bytes.
            data["token"] = token.decode("utf-8")

        for key in data:
            val = data[key]
            if isinstance(val, uuid.UUID):
                data[key] = str(val)

        return super(UserJSONRenderer, self).render(data)
