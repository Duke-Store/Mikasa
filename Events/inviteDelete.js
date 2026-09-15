module.exports = async(Client, Invite) => {
    Client.GuildsInvites.delete(Invite.code);
}
