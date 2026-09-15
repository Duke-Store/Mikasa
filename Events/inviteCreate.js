module.exports = async(Client, Invite) => {
    Client?.GuildsInvites?.set(Invite.code, Invite.uses)
}
